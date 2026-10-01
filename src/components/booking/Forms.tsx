import { useEffect, useRef, useState } from 'react';
import type { AddressInput, CustomerInput } from '@/types/booking';
import { Input } from '@/components/ui/Input';
import { isCompleteCep, lookupCep, maskCep, unmaskCep } from '@/services/cep.service';

export function CustomerForm({
  value,
  errors,
  onChange,
}: {
  value: CustomerInput;
  errors: Record<string, string>;
  onChange: (v: CustomerInput) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <Input label="Nome" name="name" value={value.name} error={errors.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Seu nome" autoComplete="name" />
      <Input label="WhatsApp / Telefone" name="phone" value={value.phone} error={errors.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} placeholder="(11) 99999-9999" inputMode="tel" autoComplete="tel" />
      <Input label="E-mail (opcional)" name="email" value={value.email} error={errors.email} onChange={(e) => onChange({ ...value, email: e.target.value })} placeholder="voce@email.com" inputMode="email" autoComplete="email" />
    </div>
  );
}

export function AddressForm({
  value,
  errors,
  onChange,
}: {
  value: AddressInput;
  errors: Record<string, string>;
  onChange: (v: AddressInput) => void;
}) {
  const set = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });

  // --- Autofill ViaCEP (conveniência; nunca bloqueia o fluxo) ---
  type Filled = { street: string; neighborhood: string; city: string; state: string };
  const [cepStatus, setCepStatus] = useState<
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | null
  >(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const lastQueriedRef = useRef<string>('');
  const appliedRef = useRef<(Filled & { zip: string }) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const digits = unmaskCep(value.zip_code);
    if (!isCompleteCep(value.zip_code)) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      abortRef.current?.abort();
      abortRef.current = null;
      if (cepStatus?.kind === 'loading') setCepStatus(null);
      return;
    }
    if (digits === lastQueriedRef.current) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    abortRef.current?.abort();
    setCepStatus({ kind: 'loading' });
    timerRef.current = window.setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestRef.current;
      void lookupCep(digits, controller.signal)
        .then((result) => {
          if (requestRef.current !== requestId) return; // resposta obsoleta
          abortRef.current = null;
          if (!result.ok) {
            lastQueriedRef.current = digits;
            appliedRef.current = null;
            setCepStatus({
              kind: 'error',
              message:
                result.reason === 'not-found'
                  ? 'CEP não encontrado. Confira o número ou preencha o endereço manualmente.'
                  : 'Não conseguimos buscar o endereço agora. Preencha os dados manualmente.',
            });
            return;
          }
          const current = valueRef.current;
          const prev = appliedRef.current;
          // Só sobrescreve campo vazio ou ainda igual ao último preenchimento;
          // edição manual do usuário é preservada. Número/complemento nunca tocados.
          const pick = (key: keyof Filled, incoming: string): string => {
            if (!incoming) return current[key];
            if (current[key] === '' || prev == null || current[key] === prev[key]) return incoming;
            return current[key];
          };
          const merged: Filled = {
            street: pick('street', result.data.street),
            neighborhood: pick('neighborhood', result.data.neighborhood),
            city: pick('city', result.data.city),
            state: pick('state', result.data.state),
          };
          lastQueriedRef.current = digits;
          appliedRef.current = { ...merged, zip: digits };
          setCepStatus(null);
          onChange({ ...current, ...merged });
          document.getElementById('address-number')?.focus({ preventScroll: false });
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          if (requestRef.current !== requestId) return;
          abortRef.current = null;
          lastQueriedRef.current = digits;
          appliedRef.current = null;
          setCepStatus({
            kind: 'error',
            message: 'Não conseguimos buscar o endereço agora. Preencha os dados manualmente.',
          });
        });
    }, 500);
  }, [value.zip_code]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, zip_code: maskCep(e.target.value) });
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <div>
        <Input label="CEP" name="zip_code" value={value.zip_code} error={errors.zip_code} onChange={handleZipChange} placeholder="00000-000" inputMode="numeric" autoComplete="postal-code" />
        {cepStatus?.kind === 'loading' && (
          <p className="mt-1 text-xs text-cinza animate-pulse" role="status">Buscando endereço…</p>
        )}
        {cepStatus?.kind === 'error' && (
          <p className="mt-1 text-xs text-red-400" role="alert">{cepStatus.message}</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Input label="Rua / Avenida" name="street" value={value.street} error={errors.street} onChange={set('street')} placeholder="Av. Paulista" /></div>
        <Input label="Número" name="number" id="address-number" value={value.number} error={errors.number} onChange={set('number')} placeholder="1000" inputMode="numeric" />
      </div>
      <Input label="Complemento (opcional)" name="complement" value={value.complement} onChange={set('complement')} placeholder="Apto, bloco…" />
      <Input label="Bairro" name="neighborhood" value={value.neighborhood} error={errors.neighborhood} onChange={set('neighborhood')} placeholder="Bela Vista" />
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Input label="Cidade" name="city" value={value.city} error={errors.city} onChange={set('city')} placeholder="São Paulo" /></div>
        <Input label="UF" name="state" value={value.state} error={errors.state} onChange={set('state')} placeholder="SP" maxLength={2} />
      </div>
      <Input label="Referência (opcional)" name="reference" value={value.reference} onChange={set('reference')} placeholder="Próximo ao…" />
      <div>
        <p id="parking-label" className="mb-1 block text-sm font-medium text-cinza">
          O técnico terá onde estacionar o carro sem custo?
        </p>
        <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="parking-label">
          {([true, false] as const).map((option) => {
            const selected = value.parking_free === option;
            return (
              <button
                key={String(option)}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ ...value, parking_free: option })}
                className={[
                  'min-h-[52px] rounded-xl border px-4 py-3 text-base font-bold transition',
                  selected
                    ? 'border-lima bg-lima text-noite'
                    : 'border-linha bg-noite text-gelo',
                ].join(' ')}
              >
                {option ? 'Sim' : 'Não'}
              </button>
            );
          })}
        </div>
        {errors.parking_free && (
          <p className="mt-1 text-xs text-red-400" role="alert">{errors.parking_free}</p>
        )}
        <p className="mt-2 text-xs text-cinza">
          <span className="font-bold text-gelo">Por que perguntamos isso?</span>
          <br />
          Quando houver um local adequado e seguro para estacionar, o técnico poderá
          realizar o conserto dentro do próprio veículo.
        </p>
      </div>
    </div>
  );
}

/** Observação opcional para o técnico (FASE 3 §7) — gravada em appointments.notes. */
export function NotesInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block" htmlFor="tech-notes">
      <span className="mb-1 block text-sm font-medium text-cinza">
        Alguma observação para o técnico? (opcional)
      </span>
      <textarea
        id="tech-notes"
        name="tech-notes"
        rows={3}
        maxLength={500}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex.: interfone quebrado, me chame no WhatsApp ao chegar…"
        className="w-full rounded-xl border border-linha bg-noite px-4 py-3 text-base text-gelo outline-none placeholder:text-cinza/60 focus:border-lima"
      />
    </label>
  );
}
