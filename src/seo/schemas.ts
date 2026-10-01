import { SEO_CONFIG } from './config';

/**
 * Dados estruturados — FASE 1: SOMENTE Organization, só com o que é verdade.
 * Sem address/geo (delivery, sem loja física), sem aggregateRating
 * (não copiar avaliações do Google para o markup), sem LocalBusiness.
 * JSON-LD reflete conteúdo visível na página (nome, slogan, contato).
 */
export function organizationSchema(): Record<string, unknown> {
  const sameAs = [SEO_CONFIG.instagram].filter((u) => u !== '');
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_CONFIG.brand,
    slogan: SEO_CONFIG.slogan,
    areaServed: {
      '@type': 'City',
      name: `${SEO_CONFIG.city}/${SEO_CONFIG.region}`,
    },
    telephone: SEO_CONFIG.phone,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: SEO_CONFIG.phone,
      contactType: 'customer service',
      areaServed: SEO_CONFIG.country,
      availableLanguage: ['Portuguese'],
    },
  };
  if (SEO_CONFIG.siteUrl) schema.url = SEO_CONFIG.siteUrl;
  if (sameAs.length > 0) schema.sameAs = sameAs;
  return schema;
}

/** WebPage conservador: só espelha a página real (título, URL, breadcrumb). */
export function webPageSchema(input: { name: string; url?: string; description: string }): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.name,
    description: input.description,
    inLanguage: 'pt-BR',
  };
  if (input.url) schema.url = input.url;
  return schema;
}

/**
 * Service conservador: descreve o serviço oferecido, sem preços no markup
 * (sem Offer), sem avaliações, sem endereço físico.
 */
export function serviceSchema(input: {
  name: string;
  url?: string;
  description: string;
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    provider: {
      '@type': 'Organization',
      name: SEO_CONFIG.brand,
      slogan: SEO_CONFIG.slogan,
    },
    areaServed: { '@type': 'City', name: `${SEO_CONFIG.city}/${SEO_CONFIG.region}` },
  };
  if (input.url) schema.url = input.url;
  return schema;
}

/** BreadcrumbList espelhando EXATAMENTE a hierarquia visível da página. */
export function breadcrumbSchema(items: Array<{ name: string; url?: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => {
      const entry: Record<string, unknown> = {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
      };
      if (item.url) entry.item = item.url;
      return entry;
    }),
  };
}

export interface PageMetaInput {
  title: string;
  description: string;
}

/** Mesma composição usada pelas páginas e pelo prerender (fonte única). */
export function homeSchemas(meta: PageMetaInput, siteUrl?: string): Array<Record<string, unknown>> {
  const url = siteUrl ? `${siteUrl}/` : undefined;
  return [
    organizationSchema(),
    webPageSchema({ name: meta.title, url, description: meta.description }),
  ];
}

export function consertoSchemas(meta: PageMetaInput, siteUrl?: string): Array<Record<string, unknown>> {
  const url = siteUrl ? `${siteUrl}/conserto-iphone/` : undefined;
  const home = siteUrl ? `${siteUrl}/` : undefined;
  return [
    webPageSchema({ name: meta.title, url, description: meta.description }),
    serviceSchema({ name: 'Conserto de iPhone', url, description: meta.description }),
    breadcrumbSchema([
      { name: 'Início', url: home },
      { name: 'Conserto de iPhone', url },
    ]),
  ];
}

export function trocaTelaSchemas(meta: PageMetaInput, siteUrl?: string): Array<Record<string, unknown>> {
  const url = siteUrl ? `${siteUrl}/troca-tela-iphone/` : undefined;
  const home = siteUrl ? `${siteUrl}/` : undefined;
  const hub = siteUrl ? `${siteUrl}/conserto-iphone/` : undefined;
  return [
    webPageSchema({ name: meta.title, url, description: meta.description }),
    serviceSchema({ name: 'Troca de tela de iPhone', url, description: meta.description }),
    breadcrumbSchema([
      { name: 'Início', url: home },
      { name: 'Conserto de iPhone', url: hub },
      { name: 'Troca de tela', url },
    ]),
  ];
}

function servicePageSchemas(
  serviceName: string,
  path: string,
  crumb: string,
  meta: PageMetaInput,
  siteUrl?: string,
): Array<Record<string, unknown>> {
  const url = siteUrl ? `${siteUrl}${path}` : undefined;
  const home = siteUrl ? `${siteUrl}/` : undefined;
  const hub = siteUrl ? `${siteUrl}/conserto-iphone/` : undefined;
  return [
    webPageSchema({ name: meta.title, url, description: meta.description }),
    serviceSchema({ name: serviceName, url, description: meta.description }),
    breadcrumbSchema([
      { name: 'Início', url: home },
      { name: 'Conserto de iPhone', url: hub },
      { name: crumb, url },
    ]),
  ];
}

export function bateriaSchemas(meta: PageMetaInput, siteUrl?: string): Array<Record<string, unknown>> {
  return servicePageSchemas('Troca de bateria de iPhone', '/troca-bateria-iphone/', 'Troca de bateria', meta, siteUrl);
}

export function vidroSchemas(meta: PageMetaInput, siteUrl?: string): Array<Record<string, unknown>> {
  return servicePageSchemas('Troca de vidro de iPhone', '/troca-vidro-iphone/', 'Troca de vidro', meta, siteUrl);
}

export function vidroTraseiroSchemas(meta: PageMetaInput, siteUrl?: string): Array<Record<string, unknown>> {
  return servicePageSchemas(
    'Troca de vidro traseiro de iPhone',
    '/vidro-traseiro-iphone/',
    'Vidro traseiro',
    meta,
    siteUrl,
  );
}
