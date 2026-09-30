import { APP_CONFIG } from '@/config/app';
import type { DeviceModel, Price, Service, ServiceOption } from '@/types/domain';
import { getSupabaseClient, missingCredentialsError } from '@/lib/supabase/client';
import type { CatalogRepository } from '../mock.repository';

interface CatalogBundle {
  company: { id: string; slug: string };
  models: DeviceModel[];
  services: Service[];
  options: ServiceOption[];
  prices: Price[];
}

let cache: { slug: string; bundle: CatalogBundle } | null = null;

async function loadBundle(): Promise<CatalogBundle> {
  const client = getSupabaseClient();
  if (!client) throw missingCredentialsError();
  const slug = APP_CONFIG.company.slug;
  if (cache && cache.slug === slug) return cache.bundle;
  const { data, error } = await client.rpc('get_public_catalog', { p_slug: slug });
  if (error) throw error;
  const bundle = data as CatalogBundle;
  cache = { slug, bundle };
  return bundle;
}

/** Limpa o cache do catálogo (uso em testes). */
export function __resetCatalogCache(): void {
  cache = null;
}

/**
 * Catálogo via Supabase — mesma interface do mock (FASE 4).
 * Leitura pública pela RPC `get_public_catalog` (definer): anon NÃO tem acesso
 * direto às tabelas. O tenant é resolvido no banco pelo slug — sem UUID no código.
 */
export const supabaseCatalogRepository: CatalogRepository = {
  async listModels(_companyId: string): Promise<DeviceModel[]> {
    return (await loadBundle()).models;
  },
  async listServices(_companyId: string): Promise<Service[]> {
    return (await loadBundle()).services;
  },
  async listServiceOptions(_companyId: string, serviceId: string): Promise<ServiceOption[]> {
    return (await loadBundle()).options.filter((o) => o.service_id === serviceId);
  },
  async findPrice(
    _companyId: string,
    modelId: string,
    serviceId: string,
    serviceOptionId: string | null,
  ): Promise<Price | null> {
    const prices = (await loadBundle()).prices;
    return (
      prices.find(
        (p) =>
          p.model_id === modelId &&
          p.service_id === serviceId &&
          (p.service_option_id ?? null) === (serviceOptionId ?? null),
      ) ?? null
    );
  },
  async listPrices(_companyId: string): Promise<Price[]> {
    return (await loadBundle()).prices;
  },
};
