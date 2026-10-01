import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { buildSitemapXml, isProductionUrl, sitemapUrl } from './src/seo/sitemap';

const dirname = path.dirname(fileURLToPath(import.meta.url));

function readSiteUrl(env: Record<string, string | undefined>): string | undefined {
  const raw = (env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
  return isProductionUrl(raw) ? raw : undefined;
}

/**
 * SEO MASTER FASE 1: emite robots.txt (sempre) e sitemap.xml no dist.
 * A linha `Sitemap:` e o próprio sitemap existem SOMENTE com VITE_SITE_URL
 * de produção válida. Sem domínio: robots sem Sitemap, nenhum sitemap.
 * (robots.txt intencionalmente NÃO está em public/ para não duplicar.)
 */
function seoFiles(): Plugin {
  let siteUrl: string | undefined;
  return {
    name: 'iplay-seo-files',
    config(_config, { mode }) {
      siteUrl = readSiteUrl(loadEnv(mode, dirname, 'VITE_'));
    },
    generateBundle() {
      const sitemap = sitemapUrl(siteUrl);
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: sitemap
          ? `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`
          : `User-agent: *\nAllow: /\n`,
      });
      const xml = buildSitemapXml(siteUrl);
      if (xml) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml });
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), seoFiles()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      // FASE 4.1 §26: code splitting simples e seguro — supabase-js em chunk
      // separado (só carrega o peso quando o módulo é importado).
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
