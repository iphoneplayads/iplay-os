// Testes da Edge Function whatsapp-webhook (YCloud).
// Roda com: node --test supabase/functions/whatsapp-webhook/index.test.ts
// (Node 22.6+ com type-stripping; sem dependências externas, sem deploy,
// sem rede, sem banco, sem alterar notification_outbox.)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeExpectedSignature,
  handleRequest,
  parseSignatureHeader,
  timingSafeEqual,
} from './index.ts';

const SECRET = 'whsec_test_secret_abc123';

async function sign(raw: string, timestamp: string, secret = SECRET): Promise<string> {
  const hex = await computeExpectedSignature(secret, timestamp, raw);
  return `t=${timestamp},s=${hex}`;
}

/** Raw canônico: JSON.stringify do objeto (a assinatura cobre exatamente este raw). */
async function postEvent(
  payload: unknown,
  opts: { secret?: string; headerOverride?: string | null; rawOverride?: string } = {},
): Promise<{ res: Response; json: unknown; logs: string[] }> {
  const raw = opts.rawOverride ?? JSON.stringify(payload);
  const timestamp = '1654084800';
  let header: string | null;
  if (opts.headerOverride !== undefined) {
    header = opts.headerOverride;
  } else {
    header = await sign(raw, timestamp, opts.secret ?? SECRET);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (header !== null) headers['YCloud-Signature'] = header;

  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(' '));
  };
  try {
    const req = new Request('https://example.com/webhook', {
      method: 'POST',
      headers,
      body: raw,
    });
    const res = await handleRequest(req, { YCLOUD_WEBHOOK_SECRET: SECRET });
    let json: unknown = null;
    try {
      json = await res.clone().json();
    } catch {
      json = null;
    }
    return { res, json, logs };
  } finally {
    console.log = originalLog;
  }
}

function baseEvent(type: string, extra: Record<string, unknown>) {
  return {
    id: 'evt_test_123',
    type,
    apiVersion: 'v2',
    createTime: '2023-02-22T12:00:00.000Z',
    ...extra,
  };
}

describe('parseSignatureHeader', () => {
  it('aceita formato oficial t=,s=', () => {
    const hex = '8eb70f2acb056c2119acbee8fdd98a889021d9c268bc9ad248a4182c40e31119';
    const parsed = parseSignatureHeader(`t=1654084800,s=${hex}`);
    assert.deepEqual(parsed, { timestamp: '1654084800', signature: hex });
  });
  it('rejeita header ausente/malformado', () => {
    assert.equal(parseSignatureHeader(null), null);
    assert.equal(parseSignatureHeader(''), null);
    assert.equal(parseSignatureHeader('Bearer abc'), null);
    assert.equal(parseSignatureHeader('t=abc,s=zzzz'), null);
    assert.equal(parseSignatureHeader('t=123'), null);
  });
});

describe('timingSafeEqual', () => {
  it('compara corretamente', () => {
    assert.equal(timingSafeEqual('abc', 'abc'), true);
    assert.equal(timingSafeEqual('abc', 'abd'), false);
    assert.equal(timingSafeEqual('abc', 'abcd'), false);
  });
});

describe('método e autenticação', () => {
  it('GET retorna 405 (handshake Meta removido)', async () => {
    const res = await handleRequest(
      new Request('https://example.com/webhook', { method: 'GET' }),
      { YCLOUD_WEBHOOK_SECRET: SECRET },
    );
    assert.equal(res.status, 405);
  });

  it('sem assinatura retorna 401', async () => {
    const { res, json } = await postEvent(baseEvent('whatsapp.message.updated', {}), {
      headerOverride: null,
    });
    assert.equal(res.status, 401);
    assert.match(JSON.stringify(json), /Assinatura inválida/);
  });

  it('assinatura com secret errado retorna 401', async () => {
    const raw = JSON.stringify(baseEvent('whatsapp.message.updated', {}));
    const badHeader = await sign(raw, '1654084800', 'whsec_wrong');
    const { res } = await postEvent(baseEvent('whatsapp.message.updated', {}), {
      headerOverride: badHeader,
    });
    assert.equal(res.status, 401);
  });

  it('assinatura malformada retorna 401', async () => {
    const { res } = await postEvent(baseEvent('whatsapp.message.updated', {}), {
      headerOverride: 't=abc,s=zzz',
    });
    assert.equal(res.status, 401);
  });

  it('secret ausente retorna 500 genérico sem vazar', async () => {
    const req = new Request('https://example.com/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const res = await handleRequest(req, {});
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.ok(!text.includes('YCLOUD'));
    assert.ok(!text.includes('whsec'));
  });

  it('JSON inválido com assinatura válida retorna 400', async () => {
    const raw = '{invalid json';
    const header = await sign(raw, '1654084800');
    const { res } = await postEvent({}, { rawOverride: raw, headerOverride: header });
    assert.equal(res.status, 400);
  });

  it('raw adulterado após assinar retorna 401', async () => {
    const original = JSON.stringify(baseEvent('whatsapp.message.updated', {}));
    const header = await sign(original, '1654084800');
    const tampered = original + ' ';
    const req = new Request('https://example.com/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'YCloud-Signature': header },
      body: tampered,
    });
    const res = await handleRequest(req, { YCLOUD_WEBHOOK_SECRET: SECRET });
    assert.equal(res.status, 401);
  });
});

describe('quatro eventos suportados', () => {
  it('whatsapp.inbound_message.received válido → 200', async () => {
    const payload = baseEvent('whatsapp.inbound_message.received', {
      whatsappInboundMessage: {
        id: 'wim123',
        wabaId: 'waba_1',
        from: '+5511999999999',
        to: '+5511888888888',
        type: 'text',
        text: { body: 'Olá, conteúdo sensível que NÃO deve ir pro log' },
      },
    });
    const { res, json, logs } = await postEvent(payload);
    assert.equal(res.status, 200);
    assert.deepEqual(json, { ok: true, type: 'whatsapp.inbound_message.received', id: 'evt_test_123' });
    const blob = logs.join('\n');
    assert.ok(!blob.includes('Olá, conteúdo sensível'));
    assert.ok(!blob.includes('+5511999999999'));
    assert.ok(!blob.includes(SECRET));
  });

  it('whatsapp.message.updated válido → 200', async () => {
    const payload = baseEvent('whatsapp.message.updated', {
      whatsappMessage: { id: 'wamid.abc', status: 'delivered', to: '+5511999999999' },
    });
    const { res, json } = await postEvent(payload);
    assert.equal(res.status, 200);
    assert.deepEqual(json, { ok: true, type: 'whatsapp.message.updated', id: 'evt_test_123' });
  });

  it('whatsapp.message.updated grupo (whatsappGroup) → 200', async () => {
    const payload = baseEvent('whatsapp.message.updated', {
      whatsappGroup: { status: 'delivered', groupId: '120363345678901234@g.us' },
    });
    const { res } = await postEvent(payload);
    assert.equal(res.status, 200);
  });

  it('whatsapp.smb.message.echoes válido → 200', async () => {
    const payload = baseEvent('whatsapp.smb.message.echoes', {
      whatsappMessage: { id: 'wamid.echo', status: 'sent', text: { body: 'segredo' } },
    });
    const { res, json, logs } = await postEvent(payload);
    assert.equal(res.status, 200);
    assert.deepEqual(json, { ok: true, type: 'whatsapp.smb.message.echoes', id: 'evt_test_123' });
    assert.ok(!logs.join('\n').includes('segredo'));
  });

  it('whatsapp.smb.app.state.sync válido → 200', async () => {
    const payload = baseEvent('whatsapp.smb.app.state.sync', {
      whatsappSmbAppStateSync: {
        wabaId: 'waba_1',
        phoneNumber: '+5511999999999',
        stateSync: [{ action: 'add', contact: { phoneNumber: '+5522999999999' } }],
      },
    });
    const { res, json, logs } = await postEvent(payload);
    assert.equal(res.status, 200);
    assert.deepEqual(json, { ok: true, type: 'whatsapp.smb.app.state.sync', id: 'evt_test_123' });
    const blob = logs.join('\n');
    assert.ok(!blob.includes('+5511999999999'));
    assert.ok(!blob.includes('+5522999999999'));
  });
});

describe('envelope e desconhecidos', () => {
  it('evento desconhecido → 200 ignored (evita retry)', async () => {
    const { res, json } = await postEvent(baseEvent('contact.created', { contactCreated: { id: '1' } }));
    assert.equal(res.status, 200);
    assert.deepEqual(json, { ok: true, ignored: true, type: 'contact.created', id: 'evt_test_123' });
  });

  it('ausência de id → 400', async () => {
    const { res } = await postEvent({ type: 'whatsapp.message.updated' });
    assert.equal(res.status, 400);
  });

  it('ausência de type → 400', async () => {
    const { res } = await postEvent({ id: 'evt_1' });
    assert.equal(res.status, 400);
  });

  it('envelope não-objeto → 400', async () => {
    const { res } = await postEvent([1, 2, 3]);
    assert.equal(res.status, 400);
  });

  it('evento conhecido sem payload específico → 400', async () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ['whatsapp.inbound_message.received', {}],
      ['whatsapp.message.updated', {}],
      ['whatsapp.smb.message.echoes', {}],
      ['whatsapp.smb.app.state.sync', {}],
    ];
    for (const [type, extra] of cases) {
      const { res } = await postEvent(baseEvent(type, extra));
      assert.equal(res.status, 400, type);
    }
  });

  it('respostas de erro nunca expõem secret', async () => {
    const { res, json, logs } = await postEvent(baseEvent('x.unknown', {}), {
      headerOverride: 't=123,s=' + 'a'.repeat(64),
    });
    const body = JSON.stringify(json) + logs.join('\n');
    assert.equal(res.status, 401);
    assert.ok(!body.includes(SECRET));
    assert.ok(!body.toLowerCase().includes('whsec'));
  });
});
