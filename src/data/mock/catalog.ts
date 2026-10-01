/**
 * MOCKS TEMPORÁRIOS (FASE 1).
 * Isolados em src/data/mock — nunca importar de outro lugar que não seja repositories/mock.
 * Na FASE 2, o Supabase substitui esta camada sem tocar no frontend.
 */
import type { DeviceModel, Price, Service, ServiceOption } from '@/types/domain';

export const COMPANY_ID = 'company-iplay';

// 27 modelos suportados (ordenados do mais novo ao mais antigo para conversão).
const MODEL_NAMES: Array<{ name: string; family: string; year: number }> = [
  { name: 'iPhone 17 Pro Max', family: '17', year: 2025 },
  { name: 'iPhone 17 Pro', family: '17', year: 2025 },
  { name: 'iPhone 17 Air', family: '17', year: 2025 },
  { name: 'iPhone 17', family: '17', year: 2025 },
  { name: 'iPhone 16 Pro Max', family: '16', year: 2024 },
  { name: 'iPhone 16 Pro', family: '16', year: 2024 },
  { name: 'iPhone 16 Plus', family: '16', year: 2024 },
  { name: 'iPhone 16', family: '16', year: 2024 },
  { name: 'iPhone 15 Pro Max', family: '15', year: 2023 },
  { name: 'iPhone 15 Pro', family: '15', year: 2023 },
  { name: 'iPhone 15 Plus', family: '15', year: 2023 },
  { name: 'iPhone 15', family: '15', year: 2023 },
  { name: 'iPhone 14 Pro Max', family: '14', year: 2022 },
  { name: 'iPhone 14 Pro', family: '14', year: 2022 },
  { name: 'iPhone 14 Plus', family: '14', year: 2022 },
  { name: 'iPhone 14', family: '14', year: 2022 },
  { name: 'iPhone 13 Pro Max', family: '13', year: 2021 },
  { name: 'iPhone 13 Pro', family: '13', year: 2021 },
  { name: 'iPhone 13 mini', family: '13', year: 2021 },
  { name: 'iPhone 13', family: '13', year: 2021 },
  { name: 'iPhone 12 Pro Max', family: '12', year: 2020 },
  { name: 'iPhone 12 Pro', family: '12', year: 2020 },
  { name: 'iPhone 12 mini', family: '12', year: 2020 },
  { name: 'iPhone 12', family: '12', year: 2020 },
  { name: 'iPhone 11 Pro Max', family: '11', year: 2019 },
  { name: 'iPhone 11 Pro', family: '11', year: 2019 },
  { name: 'iPhone 11', family: '11', year: 2019 },
];

const ts = '2026-01-01T00:00:00.000Z';

export const mockModels: DeviceModel[] = MODEL_NAMES.map((m, i) => ({
  id: `model-${m.name.toLowerCase().replace(/\s+/g, '-')}`,
  company_id: COMPANY_ID,
  name: m.name,
  family: m.family,
  year: m.year,
  active: true,
  sort_order: i + 1,
  image_url: null,
  created_at: ts,
  updated_at: ts,
}));

export const mockServices: Service[] = [
  { id: 'svc-screen', company_id: COMPANY_ID, name: 'Troca de tela', slug: 'troca-de-tela', description: 'Substituição completa da tela.', active: true, sort_order: 1, created_at: ts, updated_at: ts },
  { id: 'svc-battery', company_id: COMPANY_ID, name: 'Troca de bateria', slug: 'troca-de-bateria', description: 'Substituição da bateria.', active: true, sort_order: 2, created_at: ts, updated_at: ts },
  { id: 'svc-back-glass', company_id: COMPANY_ID, name: 'Troca de vidro traseiro', slug: 'troca-de-vidro-traseiro', description: 'Substituição do vidro traseiro.', active: true, sort_order: 3, created_at: ts, updated_at: ts },
  { id: 'svc-front-glass', company_id: COMPANY_ID, name: 'Troca de vidro da tela', slug: 'troca-de-vidro-da-tela', description: 'Substituição somente do vidro da tela.', active: true, sort_order: 4, created_at: ts, updated_at: ts },
  { id: 'svc-other', company_id: COMPANY_ID, name: 'Outro problema', slug: 'outro-problema', description: 'Diagnóstico para outros defeitos.', active: true, sort_order: 5, created_at: ts, updated_at: ts },
];

export const mockServiceOptions: ServiceOption[] = [
  {
    id: 'opt-screen-premium', company_id: COMPANY_ID, service_id: 'svc-screen',
    name: 'Premium', badge: null, warranty_months: 3, active: true, sort_order: 1,
    description: 'Opção econômica para quem procura menor preço. Pode apresentar diferenças de brilho, cores e resposta ao toque.',
    created_at: ts, updated_at: ts,
  },
  {
    id: 'opt-screen-pro', company_id: COMPANY_ID, service_id: 'svc-screen',
    name: 'Pro', badge: 'MAIS ESCOLHIDA', warranty_months: 12, active: true, sort_order: 2,
    description: 'Melhor equilíbrio entre qualidade, preço e garantia. Cores vivas, bom brilho, excelente resposta ao toque e experiência muito próxima da original.',
    created_at: ts, updated_at: ts,
  },
  {
    id: 'opt-screen-oem', company_id: COMPANY_ID, service_id: 'svc-screen',
    name: 'Original Remanufaturada', badge: null, warranty_months: 12, active: true, sort_order: 3,
    description: 'Tela original Apple remanufaturada. Componente original, qualidade equivalente à experiência original de fábrica, para quem prioriza originalidade.',
    created_at: ts, updated_at: ts,
  },
];

/**
 * Preços de EXEMPLO (mock) — apenas para demonstrar o fluxo.
 * Regra respeitada: a UI nunca contém preço; tudo vem de getPrice().
 * Modelos sem preço retornam "Preço ainda não cadastrado."
 */
function priceRow(
  id: string, modelId: string, serviceId: string, optionId: string | null,
  price: number, installmentCount = 10,
): Price {
  const installment_price = Math.round((price / installmentCount) * 100) / 100;
  return {
    id, company_id: COMPANY_ID, model_id: modelId, service_id: serviceId,
    service_option_id: optionId, price,
    pix_price: Math.round(price * 0.95 * 100) / 100,
    // Mock legado: sem cartão definido → fallback usa `price` (sem +11% presumido).
    card_price: null,
    card_price_custom: false,
    installment_count: installmentCount, installment_price,
    active: true, valid_from: null, valid_until: null,
    created_at: ts, updated_at: ts,
  };
}

export const mockPrices: Price[] = [
  priceRow('price-13-screen-pro', 'model-iphone-13', 'svc-screen', 'opt-screen-pro', 599),
  priceRow('price-13-screen-premium', 'model-iphone-13', 'svc-screen', 'opt-screen-premium', 449),
  priceRow('price-13-screen-oem', 'model-iphone-13', 'svc-screen', 'opt-screen-oem', 799),
  priceRow('price-14-screen-pro', 'model-iphone-14', 'svc-screen', 'opt-screen-pro', 649),
  priceRow('price-14-screen-premium', 'model-iphone-14', 'svc-screen', 'opt-screen-premium', 499),
  priceRow('price-14-screen-oem', 'model-iphone-14', 'svc-screen', 'opt-screen-oem', 849),
  priceRow('price-15-screen-pro', 'model-iphone-15', 'svc-screen', 'opt-screen-pro', 749),
  priceRow('price-15-screen-oem', 'model-iphone-15', 'svc-screen', 'opt-screen-oem', 949),
  priceRow('price-13-battery', 'model-iphone-13', 'svc-battery', null, 349),
  priceRow('price-14-battery', 'model-iphone-14', 'svc-battery', null, 379),
  // FASE 4: preço INATIVO de propósito (testa bloqueio de preço inativo).
  { ...priceRow('price-11-screen-pro-inactive', 'model-iphone-11', 'svc-screen', 'opt-screen-pro', 499), active: false },
];
