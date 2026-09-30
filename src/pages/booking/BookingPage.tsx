import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app';
import { AppointmentSummary } from '@/components/booking/AppointmentSummary';
import { BookingStep, ProgressIndicator } from '@/components/booking/BookingChrome';
import { AddressForm, CustomerForm, NotesInput, ScheduleForm } from '@/components/booking/Forms';
import { ModelSelector } from '@/components/booking/ModelSelector';
import { PriceCard } from '@/components/booking/PriceCard';
import { ServiceOptionCard } from '@/components/booking/ServiceOptionCard';
import { ServiceSelector } from '@/components/booking/ServiceSelector';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAttribution } from '@/hooks/useAttribution';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { trackEvent } from '@/lib/analytics/events';
import { newIdempotencyKey } from '@/lib/booking/idempotency';
import { formatBRL, formatDateBR } from '@/lib/utils/format';
import { buildBookingMessage, buildWaLink } from '@/lib/whatsapp';
import type { CreatedAppointment } from '@/types/booking';
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

  // Suporte a booking_abandoned sem leituras obsoletas no cleanup.
  const stepRef = useRef(flow.step);
  stepRef.current = flow.step;
  const createdRef = useRef<string | null>(null);

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

  const addressLine =
    flow.address.street && flow.address.number
      ? `${flow.address.street}, ${flow.address.number}${flow.address.complement ? ` — ${flow.address.complement}` : ''} · ${flow.address.neighborhood}, ${flow.address.city}/${flow.address.state} · CEP ${flow.address.zip_code}`
      : '';

  if (flow.loading) return <LoadingState message="Carregando modelos e serviços…" />;
  if (flow.error) return <ErrorState message={flow.error} onRetry={() => window.location.reload()} />;
  if (created) {
    const message = buildBookingMessage({
      name: flow.customer.name,
      protocol: created.appointment.protocol ?? created.appointment.id,
      model: selection.model?.name ?? '—',
      service: selection.service?.name ?? '—',
      option: selection.option?.name ?? null,
      value: selection.price ? formatBRL(selection.price.price) : 'a confirmar',
      date: formatDateBR(created.appointment.scheduled_date),
      time: created.appointment.scheduled_start_time,
      address: addressLine || '—',
    });
    return (
      <div className="rounded-3xl bg-musgo p-6 text-center border border-linha">
        <p className="text-4xl text-lima">✓</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-gelo">Atendimento solicitado!</h1>
        <p className="mt-1 text-sm text-cinza">Sua solicitação foi registrada. A iPlay confirma em breve pelo WhatsApp.</p>
        <dl className="mt-4 space-y-1 rounded-2xl bg-noite p-4 text-left text-sm text-nevoa">
          <div className="flex justify-between gap-2"><dt className="text-cinza">Protocolo</dt><dd className="font-mono text-xs font-semibold text-lima">{created.appointment.protocol ?? created.appointment.id}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Aparelho</dt><dd className="font-semibold text-gelo">{selection.model?.name ?? '—'}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Serviço</dt><dd className="font-semibold text-gelo">{selection.service?.name ?? '—'}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Data</dt><dd className="font-semibold text-gelo">{formatDateBR(created.appointment.scheduled_date)}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Horário</dt><dd className="font-semibold text-gelo">{created.appointment.scheduled_start_time}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-cinza">Endereço</dt><dd className="text-right font-semibold text-gelo">{addressLine || '—'}</dd></div>
        </dl>
        <a
          href={buildWaLink(flow.customer.phone, message)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block rounded-2xl bg-[#1faa55] px-6 py-4 text-center font-bold text-white min-h-[52px]"
        >
          Confirmar pelo WhatsApp
        </a>
        <Button variant="secondary" fullWidth className="mt-2" onClick={() => navigate('/')}>Voltar ao início</Button>
      </div>
    );
  }

  const selErrors = validateBookingSelection({ modelId: flow.modelId, serviceId: flow.serviceId });

  return (
    <div>
      <ProgressIndicator current={flow.step} />

      {flow.step === 'model' && (
        <BookingStep title="Escolha seu iPhone" hint="Etapa 1 de 8 — onde estou → escolher modelo → próximo: defeito.">
          <ModelSelector
            models={flow.models}
            selectedId={flow.modelId}
            onSelect={(id) => {
              flow.setModelId(id);
              trackEvent('model_selected', { modelId: id });
            }}
          />
          <Button
            fullWidth className="mt-4" disabled={!flow.modelId}
            onClick={() => { trackEvent('booking_started', { modelId: flow.modelId }); flow.setStep('service'); }}
          >
            Continuar
          </Button>
        </BookingStep>
      )}

      {flow.step === 'service' && (
        <BookingStep title="Qual problema?" hint="Etapa 2 — escolha o defeito.">
          <ServiceSelector
            services={flow.services}
            selectedId={flow.serviceId}
            onSelect={async (id) => {
              flow.setServiceId(id);
              trackEvent('service_selected', { serviceId: id });
              await flow.loadOptions(id);
            }}
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => flow.setStep('model')}>Voltar</Button>
            <Button
              disabled={!flow.serviceId}
              onClick={async () => {
                if (!flow.serviceId) return;
                if (flow.needsOption) flow.setStep('option');
                else {
                  if (flow.modelId) await flow.loadPrice(flow.modelId, flow.serviceId, null);
                  flow.setStep('price');
                }
              }}
            >
              Continuar
            </Button>
          </div>
        </BookingStep>
      )}

      {flow.step === 'option' && (
        <BookingStep title="Escolha a solução" hint="Etapa 3 — para troca de tela: Premium, Pro ou Original Remanufaturada.">
          {flow.options.length === 0 ? (
            <EmptyState title="Nenhuma opção disponível" hint="Volte e escolha outro serviço." />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {flow.options.map((o) => (
                <ServiceOptionCard
                  key={o.id}
                  option={o}
                  selected={flow.serviceOptionId === o.id}
                  onSelect={() => {
                    flow.pickOption(o.id);
                    trackEvent('service_option_selected', { serviceOptionId: o.id });
                  }}
                />
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => flow.setStep('service')}>Voltar</Button>
            <Button
              disabled={!flow.serviceOptionId}
              onClick={async () => {
                if (flow.modelId && flow.serviceId) {
                  await flow.loadPrice(flow.modelId, flow.serviceId, flow.serviceOptionId);
                }
                flow.setStep('price');
              }}
            >
              Ver preço
            </Button>
          </div>
        </BookingStep>
      )}

      {flow.step === 'price' && (
        <BookingStep title="Seu orçamento" hint="Etapa 4 — confira o valor. Para alterar a escolha, volte.">
          {flow.loadingPrice ? (
            <LoadingState message="Consultando preço…" />
          ) : (
            <>
              <PriceCard
                title={flow.selectedService?.name ?? 'Serviço'}
                subtitle={`${flow.selectedModel?.name ?? ''}${flow.selectedOption ? ` · ${flow.selectedOption.name}` : ''}`}
                price={flow.price}
              />
              <dl className="mt-3 space-y-1 rounded-2xl border border-linha bg-musgo p-4 text-sm text-nevoa">
                <div className="flex justify-between gap-2"><dt className="text-cinza">Modelo</dt><dd className="font-semibold text-gelo">{flow.selectedModel?.name ?? '—'}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-cinza">Serviço</dt><dd className="font-semibold text-gelo">{flow.selectedService?.name ?? '—'}</dd></div>
                {flow.selectedOption && (
                  <div className="flex justify-between gap-2"><dt className="text-cinza">Opção</dt><dd className="font-semibold text-gelo">{flow.selectedOption.name}</dd></div>
                )}
              </dl>
            </>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => flow.setStep(flow.needsOption ? 'option' : 'service')}>Voltar e alterar</Button>
            <Button disabled={flow.priceMissing} onClick={() => flow.setStep('customer')}>Agendar atendimento</Button>
          </div>
          {flow.priceMissing && (
            <p className="mt-2 text-center text-xs text-cinza">Preço ainda não cadastrado para esta combinação. Fale com a iPlay para confirmar o valor.</p>
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
        <BookingStep title="Data e horário" hint="Etapa 7 — escolha quando podemos ir até você.">
          <ScheduleForm value={flow.scheduling} errors={formErrors} onChange={flow.setScheduling} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => flow.setStep('address')}>Voltar</Button>
            <Button
              onClick={() => {
                const errs = validateScheduling(flow.scheduling);
                setFormErrors(errs);
                if (Object.keys(errs).length === 0) flow.setStep('confirm');
                else push('Escolha data e horário.');
              }}
            >
              Revisar
            </Button>
          </div>
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
            notes={notes}
          />
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
                    serviceOptionId: flow.needsOption ? flow.serviceOptionId : null,
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
                } catch (e) {
                  if (e instanceof PriceNotAvailableError) {
                    push(e.message);
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
  );
}
