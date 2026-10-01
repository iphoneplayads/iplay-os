/**
 * Empacota src/seo/prerender-entry.tsx para Node (o prerender.mjs importa o
 * bundle gerado). Sem rede, sem segredos; import.meta.env vira {} (o prerender
 * usa apenas conteúdo estático + mocks; dados reais hidratam no cliente).
 */
const path = require('node:path');
const esbuild = require(path.join(__dirname, '..', 'node_modules', 'esbuild', 'lib', 'main.js'));

esbuild
  .build({
    entryPoints: [path.join(__dirname, '..', 'src', 'seo', 'prerender-entry.tsx')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    jsx: 'automatic',
    alias: { '@': path.join(__dirname, '..', 'src') },
    define: { 'import.meta.env': '{}' },
    outfile: path.join(__dirname, '..', 'dist-prerender', 'prerender-entry.cjs'),
    logLevel: 'warning',
  })
  .then(() => console.log('prerender bundle ok'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
