// Teste de segurança: YCloud NUNCA chamada pelo frontend.
// Garante: nenhuma API key server-side em VITE_*, nenhum fetch à api.ycloud.com no src.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('YCloud nunca chamada pelo frontend', () => {
  it('src/ não contém API key, X-API-Key nem api.ycloud.com', () => {
    const files = walk(join(root, 'src'));
    assert.ok(files.length > 0);
    const offenders: string[] = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf8');
      if (
        content.includes('YCLOUD_API_KEY') ||
        content.includes('X-API-Key') ||
        content.includes('api.ycloud.com') ||
        content.includes('SUPABASE_SERVICE_ROLE') ||
        content.includes('SERVICE_ROLE_KEY') ||
        content.includes('OUTBOX_WORKER_SECRET')
      ) {
        offenders.push(f);
      }
    }
    assert.deepEqual(offenders, []);
  });

  it('nenhum VITE_* expõe segredo YCloud (anon key pública é permitida)', () => {
    const allowed = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_USE_MOCK', 'VITE_COMPANY_SLUG', 'VITE_SITE_URL']);
    const files = walk(join(root, 'src'));
    for (const f of files) {
      const content = readFileSync(f, 'utf8');
      const matches = (content.match(/VITE_[A-Z_]+/g) ?? []).filter((m) => !allowed.has(m));
      assert.deepEqual(matches, [], f);
    }
  });

  it('entrega não depende do frontend (sem trigger no BookingPage)', () => {
    const booking = readFileSync(join(root, 'src', 'pages', 'booking', 'BookingPage.tsx'), 'utf8');
    assert.ok(!booking.includes('triggerOutboxWorker'), 'BookingPage não deve disparar o worker');
    assert.ok(
      !booking.includes('functions/v1/process-notification-outbox'),
      'BookingPage não deve chamar a Edge Function',
    );
    const files = walk(join(root, 'src'));
    const callers = files.filter((f) =>
      readFileSync(f, 'utf8').includes('functions/v1/process-notification-outbox'),
    );
    assert.deepEqual(callers, []);
  });
});
