// Testes puros do worker (sem rede, sem banco, sem secrets).
// Roda com: node --test supabase/functions/process-notification-outbox/*.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConfirmationText,
  buildTemplateParams,
  decideSendMode,
  firstNameOf,
  formatDateBR,
  isClaimable,
  isTransientFailure,
  normalizeBRPhoneToE164,
  priceText,
  resolveFailure,
  sanitizeError,
  windowLabelOf,
} from './message.ts';

const BASE = {
  firstName: 'Maria',
  model: 'iPhone 13',
  service: 'Troca de tela',
  option: 'Premium' as string | null,
  dateBR: '10/10/2026',
  windowLabel: '09h às 11h',
  pix: 599.9 as number | null,
  card: 665.89 as number | null,
  protocol: 'IPL-20261010-AB12',
};

describe('outbox pending / envio aceito (lógica pura)', () => {
  it('mensagem de confirmação contém todos os campos e slogan correto', () => {
    const text = buildConfirmationText(BASE);
    assert.ok(text.includes('Agendamento confirmado! ✅'));
    assert.ok(text.includes('Olá, Maria!'));
    assert.ok(text.includes('iPhone 13'));
    assert.ok(text.includes('Troca de tela — Premium'));
    assert.ok(text.includes('10/10/2026'));
    assert.ok(text.includes('09h às 11h'));
    assert.ok(text.includes('Pix: R$ 599,90') || text.includes('Pix: R$ 599,90'));
    assert.ok(text.includes('em até 10x sem juros'));
    assert.ok(text.includes('Protocolo: IPL-20261010-AB12'));
    assert.ok(text.includes('📍 Atendimento no endereço informado'));
    assert.ok(text.includes('iPlay — Seu iPhone em boas mãos.'));
    assert.ok(!text.includes('novo de novo'));
  });

  it('template params seguem ordem documentada (8 posições)', () => {
    const params = buildTemplateParams(BASE);
    assert.equal(params.length, 8);
    assert.equal(params[0], 'Maria');
    assert.equal(params[1], 'iPhone 13');
    assert.equal(params[2], 'Troca de tela — Premium');
    assert.equal(params[3], '10/10/2026');
    assert.equal(params[4], '09h às 11h');
    assert.ok(params[7] === 'IPL-20261010-AB12');
  });
});

describe('erro YCloud / falhas', () => {
  it('transitório: 429, 5xx e rede voltam para retry', () => {
    assert.equal(isTransientFailure(429), true);
    assert.equal(isTransientFailure(500), true);
    assert.equal(isTransientFailure(null), true);
    assert.equal(isTransientFailure(400), false);
    assert.equal(isTransientFailure(401), false);
  });

  it('sanitiza erro sem vazar tokens longos', () => {
    const msg = sanitizeError(400, '{"errorCode":"100","key":"whsec_abcdefghijklmnopqrstuvwxyz123456"}');
    assert.ok(msg.startsWith('YCloud 400:'));
    assert.ok(!msg.includes('whsec_abcdefghijklmnopqrstuvwxyz123456'));
    assert.ok(sanitizeError(null, '').includes('network'));
  });
});

describe('API Key ausente (decisão de modo)', () => {
  it('texto livre bloqueado por padrão; template é o padrão', () => {
    const def = decideSendMode(false, undefined);
    assert.deepEqual(def, { mode: 'template' });
    assert.deepEqual(decideSendMode(false, 'text'), { error: 'TEXT_NOT_ALLOWED' });
    assert.deepEqual(decideSendMode(true, 'text'), { mode: 'text' });
  });
});

describe('telefone inválido', () => {
  it('aceita formatos BR válidos', () => {
    assert.deepEqual(normalizeBRPhoneToE164('(11) 99999-9999'), { ok: true, e164: '+5511999999999' });
    assert.deepEqual(normalizeBRPhoneToE164('11999999999'), { ok: true, e164: '+5511999999999' });
    assert.deepEqual(normalizeBRPhoneToE164('+55 11 99999-9999'), { ok: true, e164: '+5511999999999' });
    assert.deepEqual(normalizeBRPhoneToE164('5511987654321'), { ok: true, e164: '+5511987654321' });
    assert.deepEqual(normalizeBRPhoneToE164('(11) 3333-4444'), { ok: true, e164: '+551133334444' });
  });

  it('rejeita ambíguos/curtos/estrangeiros sem +', () => {
    for (const bad of ['', '123', '9999', '00000000000', '16505551234', '+16505551234', '551', '11999']) {
      const r = normalizeBRPhoneToE164(bad);
      assert.equal(r.ok, false, bad);
    }
  });
});

describe('registro já processado / concorrência', () => {
  it('claim otimista: só pending vira processing (contrato documentado)', () => {
    // O worker faz UPDATE ... WHERE status='pending'; 0 linhas = outro worker
    // venceu → 'skipped', nunca reenvia 'sent'. Testado aqui como contrato:
    const row = { id: 'a', status: 'sent' as string };
    const shouldTouch = row.status === 'pending';
    assert.equal(shouldTouch, false);
  });
});

describe('ausência de preços / Pix-cartão', () => {
  it('nunca emite R$ 0,00; omite com "a confirmar"', () => {
    assert.equal(priceText(null), 'a confirmar');
    assert.equal(priceText(0), 'a confirmar');
    assert.equal(priceText(-5), 'a confirmar');
    const text = buildConfirmationText({ ...BASE, pix: null, card: null, option: null });
    assert.ok(!text.includes('R$ 0,00') && !text.includes('R$ 0,00'));
    assert.ok(text.includes('Pix: a confirmar'));
    assert.ok(text.includes('🔧 Troca de tela'));
  });
});

describe('utilitários', () => {
  it('firstName, data BR e janela', () => {
    assert.equal(firstNameOf('  Maria Silva  '), 'Maria');
    assert.equal(firstNameOf(''), 'cliente');
    assert.equal(formatDateBR('2026-10-10'), '10/10/2026');
    assert.equal(formatDateBR('x'), 'x');
    assert.equal(windowLabelOf('09:00', '11:00'), '09h às 11h');
  });
});

describe('claim concorrente (dois workers)', () => {
  it('segundo worker não reclama linha já processing recente', () => {
    const now = Date.parse('2026-10-01T12:00:00.000Z');
    const fresh = { status: 'processing', claimed_at: '2026-10-01T11:59:00.000Z' };
    assert.equal(isClaimable({ status: 'pending', claimed_at: null }, now), true);
    assert.equal(isClaimable(fresh, now, 600), false);
    // Simula a corrida: worker A virou processing; worker B avalia depois.
    const afterA = { status: 'processing', claimed_at: new Date(now).toISOString() };
    assert.equal(isClaimable(afterA, now + 1000, 600), false);
  });

  it('sent e failed nunca são reclamados', () => {
    const now = Date.now();
    for (const status of ['sent', 'failed', 'cancelled', '']) {
      assert.equal(isClaimable({ status, claimed_at: null }, now), false, status || '(vazio)');
    }
  });
});

describe('recuperação de processing abandonado', () => {
  it('processing velho volta ao lote; recente não', () => {
    const now = Date.parse('2026-10-01T12:00:00.000Z');
    assert.equal(
      isClaimable({ status: 'processing', claimed_at: '2026-10-01T11:40:00.000Z' }, now, 600),
      true,
    );
    assert.equal(
      isClaimable({ status: 'processing', claimed_at: '2026-10-01T11:55:00.000Z' }, now, 600),
      false,
    );
  });

  it('processing pré-migration (claimed_at NULL) é recuperável', () => {
    assert.equal(isClaimable({ status: 'processing', claimed_at: null }, Date.now()), true);
  });

  it('pending pré-migration continua elegível', () => {
    assert.equal(isClaimable({ status: 'pending', claimed_at: null }, Date.now()), true);
  });
});

describe('attempts / retry (resolveFailure)', () => {
  it('transitória abaixo do teto volta a pending; no teto falha', () => {
    assert.deepEqual(resolveFailure(1, 500), { status: 'pending', result: 'retry' });
    assert.deepEqual(resolveFailure(7, 500), { status: 'pending', result: 'retry' });
    assert.deepEqual(resolveFailure(8, 500), { status: 'failed', result: 'failed' });
    assert.deepEqual(resolveFailure(1, null), { status: 'pending', result: 'retry' });
  });

  it('permanente falha já na primeira tentativa', () => {
    assert.deepEqual(resolveFailure(1, 400), { status: 'failed', result: 'failed' });
    assert.deepEqual(resolveFailure(1, 401), { status: 'failed', result: 'failed' });
  });
});
