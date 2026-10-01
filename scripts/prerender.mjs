/**
 * Prerender estático das rotas SEO (SEO MASTER — FASE 2A/2B).
 *
 * Uso: npm run build && npm run prerender
 * Gera dist/index.html (home), dist/conserto-iphone/index.html e
 * dist/troca-tela-iphone/index.html com o HTML das páginas + metas e JSON-LD.
 * O cliente hidrata normalmente (createRoot); Supabase/preços continuam CSR.
 *
 * Hospedagem: servir /conserto-iphone/ pelo arquivo da pasta e manter
 * fallback SPA (todas as demais rotas → index.html da raiz).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { renderTargetBody, targetSchemas, PRERENDER_TARGETS } = require('../dist-prerender/prerender-entry.cjs');
const dist = join(root, 'dist');

function siteUrl() {
  const raw = (process.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (!raw || !/^https:\/\/[^/]+$/i.test(raw)) return undefined;
  if (/localhost|127\.0\.0\.1|\.local$/i.test(raw)) return undefined;
  return raw;
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const base = readFileSync(join(dist, 'index.html'), 'utf8');
// Idempotência segura: nunca reprocessar saída já prerenderizada (duplicaria
// JSON-LD e preservaria marcadores errados). Ordem correta: build → prerender.
if (base.includes('data-prerendered=')) {
  throw new Error('prerender: dist/index.html já contém markup prerenderizado. Rode "vite build" antes de "prerender".');
}
const url = siteUrl();

for (const target of PRERENDER_TARGETS) {
  const body = renderTargetBody(target.routeId);
  // Marcador explícito de hidratação: o cliente só usa hydrateRoot quando
  // este path coincide com o pathname atual (ver src/main.tsx).
  const outFile = target.outFile;
  const markerPath = outFile === 'index.html' ? '/' : `/${outFile.replace(/\/index\.html$/, '/')}`;
  let html = base.replace(
    '<div id="root"></div>',
    `<div id="root" data-prerendered="1" data-prerendered-path="${markerPath}">${body}</div>`,
  );
  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(target.meta.title)}</title>`);
  html = html.replace(
    /<meta name="description" content=".*?" \/>/,
    `<meta name="description" content="${escapeHtml(target.meta.description)}" />`,
  );
  const extra = [
    `<meta name="robots" content="${target.meta.robots}" />`,
    url && target.meta.canonicalPath ? `<link rel="canonical" href="${url}${target.meta.canonicalPath}" />` : null,
    ...targetSchemas(target.routeId, url).map(
      (schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`,
    ),
  ]
    .filter((tag) => tag !== null)
    .join('\n    ');
  html = html.replace('</head>', `    ${extra}\n  </head>`);
  const outPath = join(dist, target.outFile);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  console.log(`prerender: ${target.outFile} (${body.length} chars de HTML)`);
}
