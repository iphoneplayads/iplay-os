// Teste estático da migration 0007 (conteúdo do arquivo, sem banco).
// Roda com: node --test supabase/migrations/0007.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const sql0007 = readFileSync(join(dir, '0007_outbox_service_role_grants.sql'), 'utf8');
const sql0006 = readFileSync(join(dir, '0006_outbox_delivery.sql'), 'utf8');
const lower = sql0007.toLowerCase();

describe('migration 0007 — privilégios mínimos do worker', () => {
  it('concede SELECT + UPDATE no outbox ao service_role', () => {
    assert.match(
      sql0007,
      /grant\s+select\s*,\s*update\s+on\s+public\.notification_outbox\s+to\s+service_role/i,
    );
  });

  it('concede SOMENTE SELECT nas tabelas lidas pelo worker', () => {
    for (const table of [
      'appointments',
      'clients',
      'devices',
      'device_models',
      'services',
      'service_options',
    ]) {
      assert.match(sql0007, new RegExp(`grant\\s+select\\s+on\\s+public\\.${table}\\s+to\\s+service_role`, 'i'), table);
    }
  });

  it('NÃO concede INSERT/DELETE/TRUNCATE a service_role', () => {
    const grants = lower.match(/grant\s+[^;]+?to\s+service_role/g) ?? [];
    assert.ok(grants.length > 0);
    for (const g of grants) {
      assert.ok(!/\binsert\b/.test(g), g);
      assert.ok(!/\bdelete\b/.test(g), g);
      assert.ok(!/\btruncate\b/.test(g), g);
    }
  });

  it('NÃO concede nada a anon/authenticated', () => {
    assert.ok(!/to\s+anon\b/i.test(sql0007));
    assert.ok(!/to\s+authenticated\b/i.test(sql0007));
  });

  it('NÃO toca em RLS/policies e NÃO altera estrutura', () => {
    assert.ok(!/disable\s+row\s+level\s+security/i.test(sql0007));
    assert.ok(!/create\s+policy/i.test(sql0007));
    assert.ok(!/drop\s+policy/i.test(sql0007));
    assert.ok(!/alter\s+table/i.test(sql0007));
    assert.ok(!/drop\s+table/i.test(sql0007));
    assert.ok(!/create\s+table/i.test(sql0007));
  });

  it('claim RPC continua restrita a service_role (0006 intacta)', () => {
    assert.match(sql0006, /grant\s+execute\s+on\s+function\s+public\.claim_notification_batch[^;]*to\s+service_role/i);
    assert.match(sql0006, /revoke\s+all\s+on\s+function\s+public\.claim_notification_batch[^;]*from\s+anon\s*,\s*authenticated/i);
  });

  it('0007 ordena depois de 0006 (fluxo db push pega por último)', () => {
    assert.ok('0007_outbox_service_role_grants.sql' > '0006_outbox_delivery.sql');
  });
});
