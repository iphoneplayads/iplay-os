import { APP_CONFIG } from '@/config/app';
import { getRepositories } from '@/repositories/factory';
import type { DeviceModel, Price, Service, ServiceOption } from '@/types/domain';

/** Regras de catálogo — componentes chamam estes serviços, nunca o repository direto. */
export async function getAvailableModels(): Promise<DeviceModel[]> {
  return getRepositories().catalog.listModels(APP_CONFIG.company.id);
}

export async function getAvailableServices(): Promise<Service[]> {
  return getRepositories().catalog.listServices(APP_CONFIG.company.id);
}

export async function getServiceOptions(serviceId: string): Promise<ServiceOption[]> {
  return getRepositories().catalog.listServiceOptions(APP_CONFIG.company.id, serviceId);
}

export async function getPrice(
  modelId: string,
  serviceId: string,
  serviceOptionId: string | null,
): Promise<Price | null> {
  return getRepositories().catalog.findPrice(
    APP_CONFIG.company.id,
    modelId,
    serviceId,
    serviceOptionId,
  );
}

export async function listAllPrices(): Promise<Price[]> {
  return getRepositories().catalog.listPrices(APP_CONFIG.company.id);
}

export function requiresServiceOption(serviceSlug: string, options: ServiceOption[]): boolean {
  return serviceSlug === 'troca-de-tela' && options.length > 0;
}
