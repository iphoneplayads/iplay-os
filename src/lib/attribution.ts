import type { AttributionInput } from '@/types/booking';

const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'] as const;

/** Captura atribuição da URL uma vez e carrega até a criação do agendamento. */
export function captureAttributionFromUrl(search: string): AttributionInput {
  const params = new URLSearchParams(search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    gclid: params.get('gclid'),
  };
}

export function hasAttribution(a: AttributionInput): boolean {
  return KEYS.some((k) => a[k] != null && a[k] !== '');
}
