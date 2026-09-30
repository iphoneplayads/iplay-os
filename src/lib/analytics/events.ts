import type { AnalyticsEvent, AnalyticsEventName } from '@/types/analytics';
import { APP_CONFIG } from '@/config/app';

/**
 * Camada de analytics (FASE 1: apenas buffer em memória + console).
 * Na FASE 8, plugar Google Ads/GA4 aqui sem tocar nos componentes.
 */
const buffer: AnalyticsEvent[] = [];

export function trackEvent(
  name: AnalyticsEventName,
  properties: AnalyticsEvent['properties'] = {},
): AnalyticsEvent {
  const event: AnalyticsEvent = {
    name,
    companyId: APP_CONFIG.company.id,
    properties,
    at: new Date().toISOString(),
  };
  buffer.push(event);
  // Mantido como debug explícito da fundação (remover quando integrar provedor real).
  if (import.meta.env.DEV) console.debug('[analytics]', event);
  return event;
}

export function getBufferedEvents(): readonly AnalyticsEvent[] {
  return buffer;
}

export function clearBufferedEvents(): void {
  buffer.length = 0;
}
