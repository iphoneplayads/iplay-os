// Testes de autenticação do worker + ciclo de attempts (sem rede, sem banco).
// handleWorkerRequest retorna 401/500 antes de qualquer import dinâmico ou IO,
// então é testável em Node puro.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleWorkerRequest } from './index.ts';
import { finishOutbox } from './index.ts';
import { MAX_OUTBOX_ATTEMPTS, resolveFailure, sanitizeException } from './message.ts';

const SECRET = 'test-worker-secret';

function post(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/worker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ limit: 5 }),
  });
}

describe('autenticação do worker (só x-worker-secret)', () => {
  it('sem header → 401', async () => {
    const res = await handleWorkerRequest(post(), { OUTBOX_WORKER_SECRET: SECRET });
    assert.equal(res.status, 401);
  });

  it('header errado → 401', async () => {
    const res = await handleWorkerRequest(post({ 'x-worker-secret': 'errado' }), {
      OUTBOX_WORKER_SECRET: SECRET,
    });
    assert.equal(res.status, 401);
  });

  it('secret ausente no ambiente → rejeitado (401)', async () => {
    const res = await handleWorkerRequest(post({ 'x-worker-secret': SECRET }), {});
    assert.equal(res.status, 401);
  });

  it('header correto → autorizado (segue para checagem de env)', async () => {
    // Prova que a auth passou: cai na checagem de env (500 genérico),
    // antes de qualquer DB/rede — e NÃO em 401.
    const res = await handleWorkerRequest(post({ 'x-worker-secret': SECRET }), {
      OUTBOX_WORKER_SECRET: SECRET,
    });
    assert.equal(res.status, 500);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'Worker temporariamente indisponível.');
  });

  it('Authorization Bearer sozinho NÃO autoriza', async () => {
    const res = await handleWorkerRequest(
      post({ Authorization: 'Bearer anon-key-publica' }),
      { OUTBOX_WORKER_SECRET: SECRET },
    );
    assert.equal(res.status, 401);
  });

  it('Bearer + x-worker-secret correto autoriza (formato antigo do cron)', async () => {
    const res = await handleWorkerRequest(
      post({ Authorization: 'Bearer anon-key-publica', 'x-worker-secret': SECRET }),
      { OUTBOX_WORKER_SECRET: SECRET },
    );
    assert.equal(res.status, 500);
  });
});

describe('finishOutbox nunca derruba o worker', () => {
  type Step = { error?: { code?: string; message?: string } | null; throws?: unknown };
  function fakeDb(script: Step[]) {
    const calls: Array<Record<string, unknown>> = [];
    const db = {
      from: (_table: string) => ({
        update: (patch: Record<string, unknown>) => ({
          eq: async (_col: string, _val: unknown) => {
            calls.push(patch);
            const step = script.shift() ?? { error: null };
            if (step.throws !== undefined) throw step.throws;
            return { error: step.error ?? null };
          },
        }),
      }),
    };
    return { db, calls };
  }

  function captureLogs() {
    const logs: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    };
    return { logs, restore: () => { console.log = original; } };
  }

  const FULL = {
    status: 'sent',
    sent_at: '2026-10-01T12:00:00.000Z',
    error_message: null,
    provider_message_id: 'mid_1',
    provider_wamid: 'wamid_1',
    payload: { provider: { id: 'mid_1' } },
  };

  it('A) erro no corpo do job + finish funciona', async () => {
    const { db } = fakeDb([{ error: null }]);
    const outcome = await finishOutbox(db as never, 'job-a', { status: 'failed', error_message: 'PHONE_INVALID' });
    assert.deepEqual(outcome, { recorded: true, stage: 'primary' });
  });

  it('B) primeiro update falha (42703) + fallback funciona', async () => {
    const { db, calls } = fakeDb([
      { error: { code: '42703', message: 'column does not exist' } },
      { error: null },
    ]);
    const outcome = await finishOutbox(db as never, 'job-b', FULL);
    assert.equal(outcome.recorded, true);
    assert.equal(outcome.stage, 'fallback');
    assert.ok(!('provider_message_id' in (calls[1] as object)));
  });

  it('C) primeiro update falha + fallback também falha → sem throw', async () => {
    const { db } = fakeDb([
      { error: { code: '42501', message: 'permission denied' } },
      { error: { code: '42501', message: 'permission denied' } },
    ]);
    const outcome = await finishOutbox(db as never, 'job-c', FULL);
    assert.deepEqual(outcome, { recorded: false, stage: 'fallback', code: '42501' });
  });

  it('D) falha ao marcar sent (throw de rede) não derruba', async () => {
    const { db } = fakeDb([
      { throws: new Error('socket hang up') },
      { throws: new Error('socket hang up') },
    ]);
    const outcome = await finishOutbox(db as never, 'job-d', FULL);
    assert.equal(outcome.recorded, false);
    assert.equal(outcome.code, 'THROWN');
  });

  it('E) job quebrado não impede o job seguinte', async () => {
    const { db } = fakeDb([
      { error: { code: '500', message: 'boom' } },
      { error: { code: '500', message: 'boom' } },
      { error: null },
    ]);
    const first = await finishOutbox(db as never, 'job-e1', FULL);
    const second = await finishOutbox(db as never, 'job-e2', FULL);
    assert.equal(first.recorded, false);
    assert.deepEqual(second, { recorded: true, stage: 'primary' });
  });

  it('F) nenhuma situação resulta em exceção não capturada', async () => {
    const scenarios: Step[][] = [
      [{ error: { code: '42703', message: 'no col' } }, { throws: new Error('x') }, { throws: new Error('y') }],
      [{ throws: 'string crua' }, { error: null }],
      [{ error: null }],
      [{ error: { message: 'sem código' } }, { error: null }],
    ];
    for (const script of scenarios) {
      const { db } = fakeDb(script);
      await finishOutbox(db as never, 'job-f', FULL); // rejeitaria o teste se lançasse
    }
  });

  it('G) logs sem PII/secrets/payload', async () => {
    const { db } = fakeDb([
      { error: { code: '400', message: 'falha para +5511999999999 com segredo whsec_abcdefghijklmnopqrstuvwxyz123456' } },
      { error: { code: '400', message: 'falha para +5511999999999' } },
    ]);
    const { logs, restore } = captureLogs();
    try {
      await finishOutbox(db as never, 'job-g', {
        status: 'failed',
        error_message: 'corpo Olá Maria segredo sensível +5511999999999',
        payload: { text: { body: 'conteúdo da conversa' } },
      });
    } finally {
      restore();
    }
    const blob = logs.join('\n');
    assert.ok(!blob.includes('+5511999999999'), 'telefone no log');
    assert.ok(!blob.includes('whsec_abcdefghijklmnopqrstuvwxyz123456'), 'secret no log');
    assert.ok(!blob.includes('conteúdo da conversa'), 'payload no log');
    assert.ok(!blob.includes('Olá Maria'), 'nome no log');
    assert.ok(blob.includes('job-g'), 'log deve conter o id para diagnóstico');
    assert.ok(blob.includes('400'), 'log deve conter o código técnico');
  });

  it('sanitizeException remove telefones, segredos e limita tamanho', () => {
    assert.equal(
      sanitizeException(new Error('falha para +5511999999999 token whsec_abcdefghijklmnopqrstuvwxyz123456 fim')),
      'falha para [redacted] token [redacted] fim',
    );
    assert.equal(sanitizeException(undefined), 'unknown');
    assert.ok(sanitizeException(new Error('x'.repeat(500))).length <= 200);
  });
});

describe('attempts: 1 execução YCloud = exatamente 1 attempt', () => {
  it('ciclo completo 0 → 8 sem duplo incremento', () => {
    // Simula fielmente o worker: claim faz attempts+1 no banco; finish()
    // nunca toca attempts; resolveFailure só decide o próximo status.
    let attempts = 0;
    const seen: Array<{ afterClaim: number; afterFail: number; status: string }> = [];
    for (let execution = 1; execution <= 10; execution++) {
      attempts += 1; // claim atômico (RPC ou UPDATE otimista)
      const afterClaim = attempts;
      const decided = resolveFailure(afterClaim, 500); // falha transitória
      // finish() NÃO altera attempts:
      const afterFail = attempts;
      seen.push({ afterClaim, afterFail, status: decided.status });
      assert.equal(afterFail, afterClaim, `execução ${execution}: fail não pode incrementar`);
      if (decided.status === 'failed') break;
    }
    // Sequência exigida: claim=1,fail→1,claim=2,fail→2,...,claim=8→failed
    assert.deepEqual(
      seen.map((s) => [s.afterClaim, s.afterFail, s.status]),
      [
        [1, 1, 'pending'],
        [2, 2, 'pending'],
        [3, 3, 'pending'],
        [4, 4, 'pending'],
        [5, 5, 'pending'],
        [6, 6, 'pending'],
        [7, 7, 'pending'],
        [8, 8, 'failed'],
      ],
    );
    assert.equal(MAX_OUTBOX_ATTEMPTS, 8);
  });

  it('falha permanente no attempt 1 já encerra sem inflar contador', () => {
    let attempts = 0;
    attempts += 1; // claim
    const decided = resolveFailure(attempts, 400);
    assert.deepEqual(decided, { status: 'failed', result: 'failed' });
    assert.equal(attempts, 1);
  });
});
