import { useEffect, useState } from 'react';
import { getPrice } from '@/services/catalog.service';
import type { Price, ServiceOption } from '@/types/domain';

/** Preços reais de cada opção (consultas em paralelo; sem valores inventados). */
export function useOptionPrices(
  modelId: string | null,
  serviceId: string | null,
  options: ServiceOption[],
  active: boolean,
): { prices: Record<string, Price | null>; loading: boolean } {
  const [prices, setPrices] = useState<Record<string, Price | null>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || !modelId || !serviceId) {
      setPrices({});
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      const entries = await Promise.all(
        options.map(async (o) => [o.id, await getPrice(modelId, serviceId, o.id)] as const),
      );
      if (!alive) return;
      setPrices(Object.fromEntries(entries));
      setLoading(false);
    })().catch(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [active, modelId, serviceId, options]);

  return { prices, loading };
}
