import { SEO_SITEMAP_PATHS } from './routes';

/** https de produção, sem path, sem localhost. Centraliza a validação. */
export function isProductionUrl(raw: string | undefined): raw is string {
  if (!raw) return false;
  const url = raw.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[^/]+$/i.test(url)) return false;
  return !/localhost|127\.0\.0\.1|\.local$/i.test(url);
}

/**
 * Geração de sitemap.xml — SOMENTE paths públicos, canônicos e indexáveis
 * que realmente existem (SEO_SITEMAP_PATHS). Sem admin, sem /agendar
 * (noindex nesta fase), sem query strings, sem URLs futuras.
 * Retorna `null` quando não há URL de produção válida (falha segura).
 */
export function buildSitemapXml(siteUrl: string | undefined, today = new Date()): string | null {
  if (!isProductionUrl(siteUrl)) return null;
  const date = today.toISOString().slice(0, 10);
  const urls = SEO_SITEMAP_PATHS.map(
    (path) =>
      `  <url>\n    <loc>${siteUrl}${path}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${path === '/' ? '1.0' : '0.8'}</priority>\n  </url>`,
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobotsTxt(): string {
  return 'User-agent: *\nAllow: /\n';
}

/** Linha `Sitemap:` — emitida SOMENTE com URL de produção válida. */
export function sitemapUrl(siteUrl: string | undefined): string | null {
  return isProductionUrl(siteUrl) ? `${siteUrl}/sitemap.xml` : null;
}
