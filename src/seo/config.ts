import { APP_CONFIG } from '@/config/app';
import { isProductionUrl } from './sitemap';

/**
 * Configuração central de SEO (SEO MASTER — FASE 1 fundação).
 *
 * O domínio definitivo ainda NÃO foi informado: ele chega via
 * VITE_SITE_URL (ex.: https://www.iplay.example). Sem URL válida,
 * canonical/OG/sitemap são OMITIDOS (nunca localhost, nunca falso).
 */

function viteEnv(): Record<string, string | undefined> {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    return meta.env ?? {};
  } catch {
    return {};
  }
}

function readSiteUrl(): string | undefined {
  const raw = (viteEnv().VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
  return isProductionUrl(raw)
    ? raw
    : undefined;
}

export const SEO_CONFIG = {
  brand: 'iPlay',
  slogan: 'Seu iPhone em boas mãos.',
  locale: 'pt_BR',
  city: 'Rio de Janeiro',
  region: 'RJ',
  country: 'BR',
  phone: APP_CONFIG.company.phone,
  whatsapp: APP_CONFIG.company.whatsapp,
  /** Instagram oficial — pendente: quando informado, entra em sameAs/OG. */
  instagram: '',
  siteUrl: readSiteUrl(),
  defaultImage: '',
  defaultTitle: 'iPlay — Conserto de iPhone no Rio de Janeiro com atendimento delivery',
  defaultDescription:
    'Conserto de iPhone no Rio de Janeiro com atendimento delivery: escolha o modelo, veja o preço antes de agendar e receba o técnico onde você estiver.',
} as const;

export type SeoConfig = typeof SEO_CONFIG;
