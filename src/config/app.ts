/**
 * Configuração centralizada (FASE 1).
 * Nenhum preço, lista operacional ou segredo deve ficar espalhado no código.
 * Preços reais vêm do banco (repositories); aqui ficam só constantes de app.
 */

export const APP_CONFIG = {
  company: {
    // Tenant padrão da FASE 1 (single-tenant iPlay; multi-tenant preparado via company_id).
    id: 'company-iplay',
    slug: 'iplay',
    name: 'iPlay',
    whatsapp: '5511999999999',
    phone: '(11) 99999-9999',
  },
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  },
} as const;

export const BOOKING_STEPS = [
  { id: 'model', label: 'Modelo' },
  { id: 'service', label: 'Defeito' },
  { id: 'option', label: 'Solução' },
  { id: 'price', label: 'Valor' },
  { id: 'customer', label: 'Dados' },
  { id: 'address', label: 'Endereço' },
  { id: 'schedule', label: 'Data' },
  { id: 'confirm', label: 'Confirmar' },
] as const;

export const SERVICE_MODE_LABEL: Record<string, string> = {
  mobile: 'Nós vamos até você',
};

export const INSTALLMENT_DEFAULT_COUNT = 10;

/**
 * Prova social do Google (valores reais informados pelo proprietário).
 * Fonte única — sem repetir números no JSX. Sem API nesta etapa.
 */
export const SOCIAL_PROOF = {
  googleRating: 4.8,
  googleReviewCount: 113,
  googleReviewsUrl: 'https://share.google/7UGKSTUHppFp5C0KO',
} as const;
