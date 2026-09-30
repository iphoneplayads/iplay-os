import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { captureAttributionFromUrl } from '@/lib/attribution';
import type { AttributionInput } from '@/types/booking';

const EMPTY: AttributionInput = {
  utm_source: null, utm_medium: null, utm_campaign: null,
  utm_content: null, utm_term: null, gclid: null,
};

/** Preserva UTM/gclid da URL durante todo o fluxo (memória da sessão). */
export function useAttribution(): AttributionInput {
  const [params] = useSearchParams();
  const [attribution, setAttribution] = useState<AttributionInput>(() => {
    try {
      const raw = sessionStorage.getItem('iplay-attribution');
      if (raw) return { ...EMPTY, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return EMPTY;
  });

  useEffect(() => {
    const captured = captureAttributionFromUrl(`?${params.toString()}`);
    const hasNew = Object.values(captured).some((v) => v);
    if (hasNew) {
      setAttribution((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(captured)) {
          if (v) next[k as keyof AttributionInput] = v;
        }
        try { sessionStorage.setItem('iplay-attribution', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }
  }, [params]);

  return attribution;
}
