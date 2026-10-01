import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OptionPriceCard } from '@/components/booking/OptionPriceCard';
import { getAvailableModels, getAvailableServices, getPrice, getServiceOptions } from '@/services/catalog.service';
import { displayInstallment, effectiveCard, effectivePix } from '@/lib/pricing';
import { formatBRL } from '@/lib/utils/format';
import { MAX_CARD_INSTALLMENTS } from '@/config/pricing';
import type { DeviceModel, Price, ServiceOption } from '@/types/domain';

/**
 * Explorador transacional genérico: família → modelo → preço real (mesma
 * fonte de verdade do /agendar: Supabase via repositories).
 * - Com opções (ex.: telas): um OptionPriceCard aprovado por opção.
 * - Sem opções: painel único Pix/cartão ou "Preço ainda não disponível online".
 * Sem preço hardcoded; nunca valor zerado. CTA leva ao /agendar com o serviço
 * pré-selecionado (a arquitetura atual só pré-seleciona serviço via ?servico=).
 */
export function ServicePriceExplorer({
  serviceSlug,
  compareHeading,
  ctaLabel,
}: {
  serviceSlug: string;
  compareHeading: string;
  ctaLabel: string;
}) {
  const navigate = useNavigate();
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [family, setFamily] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, Price | null>>({});
  const [singlePrice, setSinglePrice] = useState<Price | null | undefined>(undefined);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [allModels, services] = await Promise.all([getAvailableModels(), getAvailableServices()]);
        if (cancelled) return;
        const service = services.find((s) => s.slug === serviceSlug) ?? null;
        setModels(allModels.filter((m) => m.active));
        if (service) {
          setServiceId(service.id);
          setOptions(await getServiceOptions(service.id));
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceSlug]);

  const families = useMemo(() => {
    const seen = new Map<string, string>();
    for (const model of models) {
      const key = model.family ?? 'Outros';
      if (!seen.has(key)) seen.set(key, key);
    }
    return [...seen.keys()].sort((a, b) => Number(b) - Number(a));
  }, [models]);

  const visibleModels = useMemo(
    () => (family ? models.filter((m) => (m.family ?? 'Outros') === family) : models),
    [models, family],
  );

  async function pickModel(id: string) {
    if (!serviceId) return;
    setModelId(id);
    setLoadingPrices(true);
    try {
      if (options.length > 0) {
        const entries = await Promise.all(
          options.map(async (option) => [option.id, await getPrice(id, serviceId, option.id)] as const),
        );
        setPrices(Object.fromEntries(entries));
        setSinglePrice(undefined);
      } else {
        setSinglePrice(await getPrice(id, serviceId, null));
      }
    } catch {
      setPrices({});
      setSinglePrice(null);
    } finally {
      setLoadingPrices(false);
    }
  }

  function goToBooking() {
    navigate(`/agendar?servico=${serviceSlug}`);
  }

  if (failed) {
    return (
      <div className="rounded-3xl border border-linha bg-musgo p-6 text-center">
        <p className="font-semibold text-gelo">Não foi possível carregar os modelos agora.</p>
        <button type="button" onClick={goToBooking} className="mt-3 rounded-2xl bg-lima px-6 py-3 font-bold text-noite">
          Ir para o agendamento
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-bold text-cinza">1 · Escolha a família</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Família do iPhone">
        {loadingCatalog ? (
          <p className="text-sm text-cinza">Carregando modelos…</p>
        ) : (
          families.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setFamily(name);
                setModelId(null);
                setPrices({});
                setSinglePrice(undefined);
              }}
              aria-pressed={family === name}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                family === name ? 'border-lima bg-lima text-noite' : 'border-linha bg-musgo text-gelo hover:border-cinza'
              }`}
            >
              iPhone {name}
            </button>
          ))
        )}
      </div>

      {family && (
        <>
          <p className="mt-5 text-sm font-bold text-cinza">2 · Escolha o modelo</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visibleModels.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => void pickModel(model.id)}
                aria-pressed={modelId === model.id}
                className={`rounded-2xl border p-4 text-left transition ${
                  modelId === model.id ? 'border-lima bg-musgo' : 'border-linha bg-musgo hover:border-cinza'
                }`}
              >
                <span className="font-display text-base font-extrabold text-gelo">{model.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {modelId && options.length > 0 && (
        <>
          <p className="mt-5 text-sm font-bold text-cinza">3 · {compareHeading}</p>
          <div className="mt-2 grid grid-cols-1 gap-3">
            {options.map((option) => (
              <OptionPriceCard
                key={option.id}
                option={option}
                price={prices[option.id] ?? null}
                loadingPrice={loadingPrices}
                choosing={false}
                onChoose={goToBooking}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goToBooking}
            className="mt-4 w-full rounded-2xl bg-lima px-6 py-4 text-center font-bold text-noite transition hover:brightness-110 sm:w-auto"
          >
            {ctaLabel}
          </button>
        </>
      )}

      {modelId && options.length === 0 && !loadingPrices && (
        <div className="mt-5 rounded-2xl border border-linha bg-musgo p-5">
          {singlePrice ? (
            <>
              <p className="font-display text-2xl font-extrabold text-gelo">
                {formatBRL(effectivePix(singlePrice))} <span className="text-sm font-bold text-cinza">no Pix</span>
              </p>
              <p className="mt-1 text-xs text-cinza">
                {formatBRL(effectiveCard(singlePrice))} no cartão · até {MAX_CARD_INSTALLMENTS}x de{' '}
                {formatBRL(displayInstallment(effectiveCard(singlePrice)))} sem juros
              </p>
              <button
                type="button"
                onClick={goToBooking}
                className="mt-4 w-full rounded-2xl bg-lima px-6 py-4 text-center font-bold text-noite transition hover:brightness-110 sm:w-auto"
              >
                {ctaLabel}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-cinza">Preço ainda não disponível online</p>
              <p className="mt-1 text-xs text-cinza">Fale com a iPlay para consultar este serviço.</p>
              <button
                type="button"
                onClick={goToBooking}
                className="mt-4 w-full rounded-2xl border border-linha bg-noite px-6 py-3 text-center font-semibold text-gelo sm:w-auto"
              >
                Continuar para o agendamento
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
