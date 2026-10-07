import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAvailableModels, getAvailableServices, getPrice, getServiceOptions } from '@/services/catalog.service';
import { trackEvent } from '@/lib/analytics/events';
import type { AddressInput, AttributionInput, BookingStepId, CustomerInput, SchedulingInput } from '@/types/booking';
import type { DeviceModel, Price, Service, ServiceOption } from '@/types/domain';

const EMPTY_CUSTOMER: CustomerInput = { name: '', phone: '', email: '', cpf: '' };
const EMPTY_ADDRESS: AddressInput = {
  zip_code: '', street: '', number: '', complement: '',
  neighborhood: '', city: '', state: '', reference: '',
  parking_free: null,
};

export function useBookingFlow(attribution: AttributionInput) {
  const [step, setStep] = useState<BookingStepId>('model');
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [price, setPrice] = useState<Price | null>(null);
  const [priceMissing, setPriceMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modelId, setModelId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [serviceOptionId, setServiceOptionId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerInput>(EMPTY_CUSTOMER);
  const [address, setAddress] = useState<AddressInput>(EMPTY_ADDRESS);
  const [scheduling, setScheduling] = useState<SchedulingInput>({ date: '', startTime: '' });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [m, s] = await Promise.all([getAvailableModels(), getAvailableServices()]);
        if (!alive) return;
        setModels(m);
        setServices(s);
      } catch (e) {
        if (alive) {
          console.error('[booking] Falha ao carregar catálogo:', e);
          setError('Não foi possível carregar o catálogo. Tente novamente.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId) ?? null, [services, serviceId]);
  const selectedModel = useMemo(() => models.find((m) => m.id === modelId) ?? null, [models, modelId]);
  const selectedOption = useMemo(() => options.find((o) => o.id === serviceOptionId) ?? null, [options, serviceOptionId]);

  // Etapa de opções só quando houver ESCOLHA real (>1). Com 0 ou 1 opção,
  // o fluxo avança direto ao preço (a única é pré-selecionada).
  const needsOption = useMemo(() => options.length > 1, [options]);

  const loadOptions = useCallback(async (svcId: string) => {
    const opts = await getServiceOptions(svcId);
    setOptions(opts);
    setServiceOptionId(null);
    return opts;
  }, []);

  /** Troca de serviço: limpa opção/preço (evita resíduo incompatível). */
  const clearOptionSelection = useCallback(() => {
    setServiceOptionId(null);
    setPrice(null);
    setPriceMissing(false);
  }, []);

  /** Troca de modelo: limpa serviço/opção/preço (evita resíduo incompatível). */
  const clearServiceSelection = useCallback(() => {
    setServiceId(null);
    setOptions([]);
    setServiceOptionId(null);
    setPrice(null);
    setPriceMissing(false);
  }, []);

  const loadPrice = useCallback(async (mId: string, sId: string, oId: string | null) => {
    setLoadingPrice(true);
    try {
      const p = await getPrice(mId, sId, oId);
      setPrice(p);
      setPriceMissing(!p);
      if (p) trackEvent('price_viewed', { modelId: mId, serviceId: sId, serviceOptionId: oId, price: p.price });
      return p;
    } finally {
      setLoadingPrice(false);
    }
  }, []);

  void attribution;

  return {
    step, setStep,
    models, services, options, price, priceMissing, loading, loadingPrice, error,
    modelId, serviceId, serviceOptionId, customer, address, scheduling,
    selectedModel, selectedService, selectedOption, needsOption,
    setModelId, setServiceId, setCustomer, setAddress, setScheduling,
    loadOptions, loadPrice,
    clearServiceSelection, clearOptionSelection,
    pickOption: setServiceOptionId,
  };
}
