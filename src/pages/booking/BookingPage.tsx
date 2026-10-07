import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app';
import { AppointmentSummary } from '@/components/booking/AppointmentSummary';
import { BookingStep, ProgressIndicator } from '@/components/booking/BookingChrome';
import { AddressForm, CustomerForm, NotesInput } from '@/components/booking/Forms';
import { DateStrip } from '@/components/booking/DateStrip';
import { WindowCards } from '@/components/booking/WindowCards';
import { ModelBrowser } from '@/components/booking/ModelBrowser';
import { OptionPriceCard } from '@/components/booking/OptionPriceCard';
import { PriceCard } from '@/components/booking/PriceCard';
import { QuoteAside } from '@/components/booking/QuoteAside';
import { ServiceSelector } from '@/components/booking/ServiceSelector';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAttribution } from '@/hooks/useAttribution';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { useOptionPrices } from '@/hooks/useOptionPrices';
import { trackEvent } from '@/lib/analytics/events';
import { WindowTakenError } from '@/lib/booking/errors';
import { effectivePix, effectiveCard, displayInstallment } from '@/lib/pricing';
import { MAX_CARD_INSTALLMENTS } from '@/config/pricing';
import { newIdempotencyKey } from '@/lib/booking/idempotency';
import { nextCalendarDays, saoPauloNow, windowLabel } from '@/lib/scheduling';
import { formatBRL, formatDateBR } from '@/lib/utils/format';
import { getDayWindows, type DayWindow } from '@/services/availability.service';
import type { BookingStepId, CreatedAppointment } from '@/types/booking';
import {
  validateAddress,
  validateBookingSelection,
  validateCustomer,
  validateScheduling,
} from '@/lib/validation/validators';
import { AppointmentValidationError, PriceNotAvailableError, createAppointment } from '@/services/appointments.service';

export function BookingPage() {
  const attribution = useAttribution();
  const flow = useBookingFlow(attribution);
  const navigate = useNavigate();
  const { push } = useToast();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [created, setCreated] = useState<CreatedAppointment | null>(null);
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<string | null>(null);
  const [screenGuideOpen, setScreenGuideOpen] = useState(false);
  const pendingServiceOptions = useRef<Awaited<ReturnType<typeof flow.loadOptions>>>([]);

  // Janelas de atendimento (etapa schedule).
  const days = useMemo(() => nextCalendarDays(), []);
  const [windows, setWindows] = useState<DayWindow[]>([]);
  const [loadingWindows, setLoadingWindows] = useState(false);
  const [windowsError, setWindowsError] = useState<string | null>(null);

  async function loadWindows(dateISO: string) {
    setLoadingWindows(true);
    setWindowsError(null);
    try {
      setWindows(await getDayWindows(dateISO));
    } catch (e) {
      console.error('[booking] Falha ao carregar janelas:', e);
      setWindowsError('Não foi possível carregar os horários. Tente novamente.');
      setWindows([]);
    } finally {
      setLoadingWindows(false);
    }
  }

  function pickDate(dateISO: string) {
    // Trocar a data invalida a janela anterior (vale só o que continua válido).
    flow.setScheduling({ date: dateISO, startTime: '' });
    setFormErrors({});
    void loadWindows(dateISO);
  }

  function pickWindow(start: string, end: string) {
    flow.setScheduling({ date: flow.scheduling.date, startTime: start, endTime: end });
    setFormErrors({});
    trackEvent('schedule_selected', { date: flow.scheduling.date, window: start });
    // Avanço automático (mesmo padrão da seleção do modelo); a próxima etapa existe.
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      flow.setStep('confirm');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    }, 220);
  }

  // Ao ENTRAR na etapa: hoje por padrão + (re)carrega ocupação real;
  // invalida janela que deixou de ser livre sem arrastar estado inválido.
  const prevStep = useRef(flow.step);
  useEffect(() => {
    const entered = prevStep.current !== 'schedule' && flow.step === 'schedule';
    prevStep.current = flow.step;
    if (!entered) return;
    const date = flow.scheduling.date || saoPauloNow().dateISO;
    if (!flow.scheduling.date) flow.setScheduling({ date, startTime: '' });
    setLoadingWindows(true);
    setWindowsError(null);
    getDayWindows(date)
      .then((w) => {
        setWindows(w);
        setLoadingWindows(false);
        const current = flow.scheduling.startTime;
        if (current && !w.some((x) => x.start === current && x.state === 'free')) {
          flow.setScheduling({ date, startTime: '' });
        }
      })
      .catch((e) => {
        console.error('[booking] Falha ao carregar janelas:', e);
        setWindowsError('Não foi possível carregar os horários. Tente novamente.');
        setLoadingWindows(false);
      });
  });

  // Suporte a booking_abandoned sem leituras obsoletas no cleanup.
  const stepRef = useRef(flow.step);
  stepRef.current = flow.step;
  const createdRef = useRef<string | null>(null);
  // Timer do avanço automático na seleção do modelo (feedback antes de avançar).
  const advanceTimer = useRef<number | null>(null);

  // FASE 4 §14: uma chave por tentativa de confirmação — retries/duplo clique
  // reutilizam a mesma chave e o banco devolve o agendamento já criado.
  const idempotencyRef = useRef<string | null>(null);
  useEffect(() => {
    if (flow.step === 'confirm' && !idempotencyRef.current) {
      idempotencyRef.current = newIdempotencyKey();
    }
  }, [flow.step]);

  useEffect(() => {
    trackEvent('page_view', { page: 'booking' });
    return () => {
      if (!createdRef.current && stepRef.current !== 'model') {
        trackEvent('booking_abandoned', { step: stepRef.current });
      }
    };
  }, []);

  // Pré-seleção opcional via ?servico=<slug> (cards da Home). Fluxo padrão
  // inalterado: começa no modelo; o serviço já vem escolhido adiante.
  const [searchParams] = useSearchParams();
  const preselectDone = useRef(false);
  const services = flow.services;
  const flowLoading = flow.loading;
  const flowError = flow.error;
  const setServiceId = flow.setServiceId;
  const loadOptions = flow.loadOptions;
  useEffect(() => {
    if (preselectDone.current || flowLoading || flowError) return;
    const slug = searchParams.get('servico');
    if (!slug) return;
    const svc = services.find((s) => s.slug === slug);
    if (!svc) return;
    preselectDone.current = true;
    setServiceId(svc.id);
    trackEvent('service_selected', { serviceId: svc.id, via: 'home' });
    void loadOptions(svc.id);
  }, [flowLoading, flowError, services, searchParams, setServiceId, loadOptions]);

  const selection = useMemo(
    () => ({
      model: flow.selectedModel,
      service: flow.selectedService,
      option: flow.selectedOption,
      price: flow.price,
    }),
    [flow.selectedModel, flow.selectedService, flow.selectedOption, flow.price],
  );

  // Garantia sempre da estrutura (opção); nunca prometida quando desconhecida.
  const warrantyLabel = useMemo(() => {
    const months = flow.selectedOption?.warranty_months;
    if (months == null) return null;
    return `${months} ${months === 1 ? 'mês' : 'meses'} de garantia`;
  }, [flow.selectedOption]);

  const quote = useMemo(
    () => ({ ...selection, warrantyLabel }),
    [selection, warrantyLabel],
  );

  const optionPrices = useOptionPrices(
    flow.modelId,
    flow.serviceId,
    flow.options,
    flow.step === 'option',
  );

  async function chooseOption(optionId: string) {
    if (!flow.modelId || !flow.serviceId) return;
    setChoosingId(optionId);
    try {
      flow.pickOption(optionId);
      trackEvent('service_option_selected', { serviceOptionId: optionId });
      await flow.loadPrice(flow.modelId, flow.serviceId, optionId);
      flow.setStep('price');
    } finally {
      setChoosingId(null);
    }
  }

  function editQuoteStep(step: BookingStepId) {
    if (step !== 'model' && step !== 'service' && step !== 'option') return;
    if (step === 'option' && !flow.needsOption) {
      flow.setStep('service');
      return;
    }
    flow.setStep(step);
  }

  const addressLine =
    flow.address.street && flow.address.number
      ? `${flow.address.street}, ${flow.address.number}${flow.address.complement ? ` — ${flow.address.complement}` : ''} · ${flow.address.neighborhood}, ${flow.address.city}/${flow.address.state} · CEP ${flow.address.zip_code}`
      : '';

  if (flow.loading) return <LoadingState message="Carregando modelos e serviços…" />;
  if (flow.error) return <ErrorState message={flow.error} onRetry={() => window.location.reload()} />;
  if (created) {
    const pixTotal =
      created.appointment.quoted_pix_total ??
      (selection.price ? effectivePix(selection.price) : null);
    const cardTotal =
      created.appointment.quoted_card_total ??
      (selection.price ? effectiveCard(selection.price) : null);
    const pixLabel = pixTotal != null ? formatBRL(pixTotal) : 'a confirmar';
    const cardLabel =
      cardTotal != null
        ? `${formatBRL(cardTotal)} em até ${MAX_CARD_INSTALLMENTS}x de ${formatBRL(displayInstallment(cardTotal))} sem juros`
        : 'a confirmar';
    return (
      <div className="rounded-3xl bg-musgo p-6 text-center border border-linha">
        <p className="text-4xl text-lima">✓</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-gelo">Atendimento solicitado!</h1>
        <p className="mt-1 text-sm text-cinza">Sua solicitação foi registrada. Você receberá a confirmação e as atualizações do atendimento pelo WhatsApp.</p>
        <dl className="mt-4 space-y-1 rounded-2xl bg-noite p-4 text-left text-sm text-nevoa">
          <div className="flex justify-between gap-2"><dt className="text-cinza">Protocolo</dt><dd className="font-mono text-xs font-semibold text-lima">{created.appointment.protocol ?? created.appointment.id}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Aparelho</dt><dd className="font-semibold text-gelo">{selection.model?.name ?? '—'}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Serviço</dt><dd className="font-semibold text-gelo">{selection.service?.name ?? '—'}{selection.option ? ` — ${selection.option.name}` : ''}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Data</dt><dd className="font-semibold text-gelo">{formatDateBR(created.appointment.scheduled_date)}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Janela de atendimento</dt><dd className="font-semibold text-gelo">{created.appointment.scheduled_end_time ? windowLabel(created.appointment.scheduled_start_time.slice(0, 5), created.appointment.scheduled_end_time.slice(0, 5)) : created.appointment.scheduled_start_time}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Pix</dt><dd className="font-semibold text-gelo">{pixLabel}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Cartão</dt><dd className="text-right font-semibold text-gelo">{cardLabel}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-cinza">O atendimento será realizado dentro da janela selecionada, no endereço informado.</p>
        <p className="mt-3 text-sm font-semibold text-gelo">iPlay — Seu iPhone em boas mãos.</p>
        <a
          href={`https://wa.me/${APP_CONFIG.company.whatsapp}?text=${encodeURIComponent('Olá! Fiz um agendamento no site e gostaria de falar com a iPlay.')}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block rounded-2xl border border-linha bg-noite px-6 py-3 text-center font-semibold text-gelo min-h-[52px]"
        >
          Falar com a iPlay via WhatsApp
        </a>
        <Button variant="secondary" fullWidth className="mt-2" onClick={() => navigate('/')}>Voltar ao início</Button>
      </div>
    );
  }

  const selErrors = validateBookingSelection({ modelId: flow.modelId, serviceId: flow.serviceId });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
      <ProgressIndicator current={flow.step} />

      {flow.step === 'model' && (
        <BookingStep title="Qual é o seu iPhone?" hint="Escolha o modelo para ver os serviços disponíveis.">
          <ModelBrowser
            models={flow.models}
            selectedId={flow.modelId}
            onSelect={(id) => {
              if (flow.modelId && flow.modelId !== id) flow.clearServiceSelection();
              flow.setModelId(id);
              trackEvent('model_selected', { modelId: id });
              // Avanço automático após feedback visual (~220ms). Toques
              // repetidos reiniciam o timer; sem botão Continuar nesta etapa.
              if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
              advanceTimer.current = window.setTimeout(() => {
                trackEvent('booking_started', { modelId: id });
                flow.setStep('service');
                const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
              }, 220);
            }}
          />
        </BookingStep>
      )}

      {flow.step === 'service' && (
        <BookingStep title="O que aconteceu com seu iPhone?" hint="Etapa 2 — escolha o problema.">
          <ServiceSelector
            services={flow.services}
            selectedId={flow.serviceId}
            onSelect={async (id) => {
              if (flow.serviceId && flow.serviceId !== id) flow.clearOptionSelection();
              flow.setServiceId(id);
              trackEvent('service_selected', { serviceId: id });
              pendingServiceOptions.current = await flow.loadOptions(id);
              setUpsellOpen(true);
              const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
            }}
          />
          <div className="mt-4">
            <Button variant="secondary" fullWidth onClick={() => { setUpsellOpen(false); flow.setStep('model'); }}>Voltar</Button>
          </div>
        </BookingStep>
      )}

      {flow.step === 'service' && upsellOpen && flow.serviceId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-6">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-linha bg-musgo p-5 sm:max-w-xl sm:rounded-3xl sm:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-lima">Próximo passo · opcional</p>
            <h3 className="mt-1 font-display text-2xl font-extrabold text-gelo">Quer proteger seu iPhone?</h3>
            <p className="mt-1 text-sm text-cinza">Escolha uma película ou siga sem adicionar.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                ['Hydrogel Transparente', 'R$ 47,00'],
                ['Hydrogel Fosca', 'R$ 47,00'],
                ['Hydrogel Privacidade', 'R$ 97,00'],
              ].map(([name, value]) => (
                <button key={name} type="button" onClick={async () => {
                  setSelectedFilm(name); setUpsellOpen(false);
                  const opts = pendingServiceOptions.current;
                  if (opts.length > 1) return flow.setStep('option');
                  const single = opts.length === 1 ? opts[0].id : null;
                  if (single) flow.pickOption(single);
                  if (flow.modelId) await flow.loadPrice(flow.modelId, flow.serviceId!, single);
                  flow.setStep('price');
                }} className="rounded-2xl border border-linha bg-noite p-4 text-left transition hover:border-lima">
                  <span className="block font-bold text-gelo">Película {name}</span>
                  <span className="mt-1 block text-sm font-extrabold text-lima">{value}</span>
                </button>
              ))}
              <button type="button" onClick={async () => {
                setSelectedFilm(null); setUpsellOpen(false);
                const opts = pendingServiceOptions.current;
                if (opts.length > 1) return flow.setStep('option');
                const single = opts.length === 1 ? opts[0].id : null;
                if (single) flow.pickOption(single);
                if (flow.modelId) await flow.loadPrice(flow.modelId, flow.serviceId!, single);
                flow.setStep('price');
              }} className="rounded-2xl border border-linha bg-noite p-4 text-left font-bold text-cinza transition hover:border-cinza hover:text-gelo">
                <span className="mr-2 font-black text-red-500" aria-hidden="true">✕</span>
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {flow.step === 'option' && (
        <BookingStep title="Escolha a solução" hint="Etapa 3 — compare as opções com preço e garantia reais.">
          <button
            type="button"
            onClick={() => setScreenGuideOpen(true)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-lima hover:underline"
          >
            Entenda a diferença entre as telas →
          </button>
          {screenGuideOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Diferença entre os tipos de tela">
              <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-linha bg-musgo p-5 sm:max-w-2xl sm:rounded-3xl sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-lima">Guia rápido</p>
                    <h3 className="mt-1 font-display text-2xl font-extrabold text-gelo">Qual tela escolher?</h3>
                    <p className="mt-1 text-sm text-cinza">Compare sem sair do seu agendamento.</p>
                  </div>
                  <button type="button" onClick={() => setScreenGuideOpen(false)} aria-label="Fechar" className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-linha bg-noite text-xl text-gelo">×</button>
                </div>
                <div className="mt-5 grid gap-3">
                  {[
                    ['Premium', '★★★½', 'Boa qualidade', 'Cores equilibradas', 'Toque responsivo', '3 meses de garantia'],
                    ['Pro', '★★★★', 'Qualidade superior', 'Cores vivas e brilho forte', 'Toque muito próximo ao original', '1 ano de garantia'],
                    ['Original Remanufaturada', '★★★★★', 'Peça original remanufaturada', 'Mesma qualidade de imagem e toque do original', 'Máxima fidelidade', '1 ano de garantia'],
                  ].map(([name, stars, a, b, c, warranty]) => (
                    <div key={name} className="rounded-2xl border border-linha bg-noite p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-display text-lg font-extrabold text-gelo">{name}</p>
                        <span className="whitespace-nowrap text-sm font-bold text-lima">{stars}</span>
                      </div>
                      <div className="mt-3 grid gap-1 text-sm text-nevoa sm:grid-cols-3">
                        <span>✓ {a}</span><span>✓ {b}</span><span>✓ {c}</span>
                      </div>
                      <p className="mt-3 text-xs font-bold text-lima">{warranty}</p>
                    </div>
                  ))}
                </div>
                <Button fullWidth className="mt-5" onClick={() => setScreenGuideOpen(false)}>Voltar para escolher</Button>
              </div>
            </div>
          )}
          {flow.options.length === 0 ? (
            <EmptyState title="Nenhuma opção disponível" hint="Volte e escolha outro serviço." />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {flow.options.map((o) => (
                <OptionPriceCard
                  key={o.id}
                  option={o}
                  price={optionPrices.prices[o.id] ?? null}
                  loadingPrice={optionPrices.loading}
                  choosing={choosingId === o.id}
                  onChoose={() => void chooseOption(o.id)}
                />
              ))}
            </div>
          )}
          <div className="mt-4">
            <Button variant="secondary" fullWidth onClick={() => flow.setStep('service')}>Voltar</Button>
          </div>
        </BookingStep>
      )}

      {flow.step === 'price' && (
        <BookingStep title="Seu reparo" hint="Etapa 4 — confira o valor e continue para o agendamento.">
          {flow.loadingPrice ? (
            <LoadingState message="Consultando preço…" />
          ) : (
            <>
              <PriceCard
                title={flow.selectedService?.name ?? 'Serviço'}
                subtitle={flow.selectedOption?.name ?? ''}
                price={flow.price}
              />
              {selectedFilm && (
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-linha bg-musgo px-4 py-3 text-sm">
                  <span className="text-cinza">Película selecionada</span>
                  <span className="font-bold text-gelo">Película {selectedFilm}</span>
                </div>
              )}
              <dl className="mt-3 space-y-1 rounded-2xl border border-linha bg-musgo p-4 text-sm text-nevoa">
                <div className="flex justify-between gap-2"><dt className="text-cinza">Modelo</dt><dd className="font-semibold text-gelo">{flow.selectedModel?.name ?? '—'}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-cinza">Serviço</dt><dd className="font-semibold text-gelo">{flow.selectedService?.name ?? '—'}</dd></div>
                {flow.selectedOption && (
                  <div className="flex justify-between gap-2"><dt className="text-cinza">Opção</dt><dd className="font-semibold text-gelo">{flow.selectedOption.name}</dd></div>
                )}
                {warrantyLabel && (
                  <div className="flex justify-between gap-2"><dt className="text-cinza">Garantia</dt><dd className="font-semibold text-lima">{warrantyLabel}</dd></div>
                )}
              </dl>
            </>
          )}
          {flow.priceMissing ? (
            <>
              <p className="mt-3 text-center text-sm font-semibold text-gelo">Preço ainda não disponível online</p>
              <p className="mt-1 text-center text-sm text-cinza">Fale com a iPlay para consultar este serviço.</p>
              <a
                href={`https://wa.me/${APP_CONFIG.company.whatsapp}?text=${encodeURIComponent(`Olá! Quero consultar o valor de ${flow.selectedService?.name ?? 'um serviço'} para ${flow.selectedModel?.name ?? 'meu iPhone'}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block rounded-2xl border border-linha bg-musgo px-6 py-4 text-center font-semibold text-gelo min-h-[52px]"
              >
                Falar no WhatsApp
              </a>
              <Button variant="secondary" fullWidth className="mt-2" onClick={() => flow.setStep(flow.needsOption ? 'option' : 'service')}>Voltar e alterar</Button>
            </>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => flow.setStep(flow.needsOption ? 'option' : 'service')}>Voltar e alterar</Button>
              <Button onClick={() => flow.setStep('customer')}>Continuar para agendamento</Button>
            </div>
          )}
        </BookingStep>
      )}

      {flow.step === 'customer' && (
        <BookingStep title="Seus dados" hint="Etapa 5 — poucos campos, direto ao ponto.">
          <CustomerForm value={flow.customer} errors={formErrors} onChange={flow.setCustomer} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => flow.setStep('price')}>Voltar</Button>
            <Button
              onClick={() => {
                const errs = validateCustomer(flow.customer);
                setFormErrors(errs);
                if (Object.keys(errs).length === 0) {
                  trackEvent('customer_data_completed', {});
                  flow.setStep('address');
                } else push('Confira seus dados antes de continuar.');
              }}
            >
              Continuar
            </Button>
          </div>
        </BookingStep>
      )}

      {flow.step === 'address' && (
        <BookingStep title="Onde será o atendimento?" hint="Etapa 6 — Nós vamos até você.">
          <AddressForm value={flow.address} errors={formErrors} onChange={flow.setAddress} />
          <div className="mt-3">
            <NotesInput value={notes} onChange={setNotes} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => flow.setStep('customer')}>Voltar</Button>
            <Button
              onClick={() => {
                const errs = validateAddress(flow.address);
                setFormErrors(errs);
                if (Object.keys(errs).length === 0) {
                  trackEvent('address_completed', {});
                  flow.setStep('schedule');
                } else push('Confira o endereço antes de continuar.');
              }}
            >
              Continuar
            </Button>
          </div>
        </BookingStep>
      )}

      {flow.step === 'schedule' && (
        <BookingStep title="Quando podemos ir até você?" hint="Escolha o melhor dia e uma janela de atendimento.">
          <DateStrip days={days} selected={flow.scheduling.date} onSelect={pickDate} />
          <div className="mt-4">
            <p className="mb-2 text-sm font-bold text-gelo">Escolha uma janela</p>
            {loadingWindows ? (
              <LoadingState message="Consultando horários…" />
            ) : windowsError ? (
              <ErrorState
                message={windowsError}
                onRetry={() => {
                  if (flow.scheduling.date) void loadWindows(flow.scheduling.date);
                }}
              />
            ) : (
              <WindowCards
                windows={windows}
                selectedStart={flow.scheduling.startTime}
                onSelect={pickWindow}
              />
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => flow.setStep('address')}>Voltar</Button>
            <Button
              disabled={!flow.scheduling.startTime}
              onClick={() => {
                const errs = validateScheduling(flow.scheduling);
                setFormErrors(errs);
                if (Object.keys(errs).length === 0) flow.setStep('confirm');
                else push('Escolha dia e janela.');
              }}
            >
              Continuar
            </Button>
          </div>
          {(formErrors.date || formErrors.startTime) && (
            <p className="mt-2 text-sm text-red-400" role="alert">
              {[formErrors.date, formErrors.startTime].filter(Boolean).join(' ')}
            </p>
          )}
        </BookingStep>
      )}

      {flow.step === 'confirm' && (
        <BookingStep title="Seu atendimento" hint="Etapa 8 — revise tudo antes de confirmar.">
          <AppointmentSummary
            selection={selection}
            customerName={flow.customer.name}
            phone={flow.customer.phone}
            addressLine={addressLine}
            date={flow.scheduling.date}
            time={flow.scheduling.startTime}
            timeEnd={flow.scheduling.endTime}
            notes={notes}
          />
          <p className="mt-2 text-xs text-cinza">
            O atendimento será realizado dentro da janela selecionada.
          </p>
          {Object.keys(selErrors).length > 0 && (
            <p className="mt-2 text-sm text-red-400">Faltam: {Object.values(selErrors).join(' ')}</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => flow.setStep('schedule')}>Voltar e editar</Button>
            <Button
              disabled={submitting || Object.keys(selErrors).length > 0}
              onClick={async () => {
                if (!flow.modelId || !flow.serviceId) return;
                setSubmitting(true);
                try {
                  const result = await createAppointment({
                    companyId: APP_CONFIG.company.id,
                    client: flow.customer,
                    deviceModelId: flow.modelId,
                    serviceId: flow.serviceId,
                    serviceOptionId: flow.serviceOptionId,
                    priceId: flow.price?.id ?? null,
                    address: flow.address,
                    scheduling: flow.scheduling,
                    notes: notes.trim() || undefined,
                    idempotencyKey: idempotencyRef.current ?? undefined,
                    attribution,
                    source: 'site',
                  });
                  trackEvent('appointment_created', { appointmentId: result.appointment.id });
                  createdRef.current = result.appointment.id;
                  setCreated(result);
                  // A confirmação WhatsApp é processada server-side (cron → worker).
                  // O frontend apenas conclui o booking e exibe o sucesso.
                } catch (e) {
                  if (e instanceof PriceNotAvailableError) {
                    push(e.message);
                  } else if (e instanceof WindowTakenError) {
                    push(e.message);
                    flow.setStep('schedule');
                  } else if (e instanceof AppointmentValidationError) {
                    const mapped: Record<string, string> = {};
                    for (const err of e.errors) {
                      const short = err.field.split('.').pop() ?? err.field;
                      mapped[short] = err.message;
                    }
                    setFormErrors(mapped);
                    push('Confira os dados antes de confirmar.');
                  } else {
                    console.error('[booking] Falha ao criar agendamento:', e);
                    push('Não foi possível concluir seu agendamento agora. Tente novamente.');
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? 'Confirmando…' : 'Confirmar atendimento'}
            </Button>
          </div>
        </BookingStep>
      )}
      </div>
      <aside className="hidden lg:block" aria-label="Resumo do orçamento">
        <QuoteAside selection={quote} onEdit={editQuoteStep} />
      </aside>
    </div>
  );
}
