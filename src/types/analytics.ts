/** Eventos de analytics (FASE 1: só arquitetura; sem integração externa). */
export type AnalyticsEventName =
  | 'page_view'
  | 'model_selected'
  | 'service_selected'
  | 'service_option_selected'
  | 'price_viewed'
  | 'booking_started'
  | 'customer_data_completed'
  | 'address_completed'
  | 'appointment_created'
  | 'booking_abandoned'
  | 'schedule_selected';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  companyId?: string;
  properties?: Record<string, string | number | boolean | null>;
  at: string;
}
