import { useEffect } from 'react';
import { SEO_CONFIG } from './config';
import type { SeoRouteMeta } from './routes';

function siteUrl(): string | undefined {
  return SEO_CONFIG.siteUrl;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Head SEO por rota, sem bibliotecas (manipulação direta e idempotente do
 * document.head; JSON-LD com cleanup ao desmontar).
 */
export function SeoHead({ meta, schemas = [] }: { meta: SeoRouteMeta; schemas?: Array<Record<string, unknown>> }) {
  useEffect(() => {
    document.title = meta.title;
    upsertMeta('name', 'description', meta.description);
    upsertMeta('name', 'robots', meta.robots);

    const base = siteUrl();
    const canonical = base && meta.canonicalPath ? `${base}${meta.canonicalPath}` : null;
    if (canonical) upsertLink('canonical', canonical);

    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('property', 'og:type', meta.ogType);
    upsertMeta('property', 'og:locale', SEO_CONFIG.locale);
    upsertMeta('property', 'og:site_name', SEO_CONFIG.brand);
    if (canonical) upsertMeta('property', 'og:url', canonical);
    if (SEO_CONFIG.defaultImage) upsertMeta('property', 'og:image', SEO_CONFIG.defaultImage);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
    if (SEO_CONFIG.defaultImage) upsertMeta('name', 'twitter:image', SEO_CONFIG.defaultImage);

    const scripts: HTMLScriptElement[] = schemas.map((schema) => {
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.text = JSON.stringify(schema);
      document.head.appendChild(el);
      return el;
    });
    return () => {
      for (const el of scripts) el.remove();
    };
  }, [meta, schemas]);

  return null;
}
