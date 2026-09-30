import type { AddressInput, CustomerInput, SchedulingInput } from '@/types/booking';
import { minBookingDate } from '@/lib/utils/format';
import { Input } from '@/components/ui/Input';

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
  return (
    <div className="grid grid-cols-1 gap-3">
      <Input label="CEP" name="zip_code" value={value.zip_code} error={errors.zip_code} onChange={set('zip_code')} placeholder="00000-000" inputMode="numeric" />
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Input label="Rua / Avenida" name="street" value={value.street} error={errors.street} onChange={set('street')} placeholder="Av. Paulista" /></div>
        <Input label="Número" name="number" value={value.number} error={errors.number} onChange={set('number')} placeholder="1000" inputMode="numeric" />
      </div>
      <Input label="Complemento (opcional)" name="complement" value={value.complement} onChange={set('complement')} placeholder="Apto, bloco…" />
      <Input label="Bairro" name="neighborhood" value={value.neighborhood} error={errors.neighborhood} onChange={set('neighborhood')} placeholder="Bela Vista" />
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Input label="Cidade" name="city" value={value.city} error={errors.city} onChange={set('city')} placeholder="São Paulo" /></div>
        <Input label="UF" name="state" value={value.state} error={errors.state} onChange={set('state')} placeholder="SP" maxLength={2} />
      </div>
      <Input label="Referência (opcional)" name="reference" value={value.reference} onChange={set('reference')} placeholder="Próximo ao…" />
    </div>
  );
}

export function ScheduleForm({
  value,
  errors,
  onChange,
}: {
  value: SchedulingInput;
  errors: Record<string, string>;
  onChange: (v: SchedulingInput) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input label="Data" type="date" name="date" value={value.date} error={errors.date} min={minBookingDate()} onChange={(e) => onChange({ ...value, date: e.target.value })} />
      <Input label="Horário" type="time" name="startTime" value={value.startTime} error={errors.startTime} onChange={(e) => onChange({ ...value, startTime: e.target.value })} />
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
