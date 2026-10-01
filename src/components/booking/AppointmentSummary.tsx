import { SERVICE_MODE_LABEL } from '@/config/app';
import type { BookingSelection } from '@/types/booking';
import { formatBRL, formatDateBR } from '@/lib/utils/format';
import { displayInstallment, effectiveCard, effectivePix } from '@/lib/pricing';
import { MAX_CARD_INSTALLMENTS } from '@/config/pricing';
import { windowLabel } from '@/lib/scheduling';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-cinza">{label}</dt>
      <dd className="text-right font-semibold text-gelo">{value}</dd>
    </div>
  );
}

export function AppointmentSummary({
  selection,
  customerName,
  phone,
  addressLine,
  date,
  time,
  timeEnd,
  notes,
}: {
  selection: BookingSelection;
  customerName: string;
  phone?: string;
  addressLine?: string;
  date: string;
  time: string;
  /** Fim da janela — quando presente, "Quando" vira janela ("09h às 11h"). */
  timeEnd?: string;
  notes?: string;
}) {
  return (
    <div className="rounded-2xl border border-linha bg-musgo p-4 text-sm">
      <p className="font-display font-extrabold text-gelo">Resumo do agendamento</p>
      <dl className="mt-2 space-y-1 text-nevoa">
        <Row label="Aparelho" value={selection.model?.name ?? '—'} />
        <Row label="Serviço" value={selection.service?.name ?? '—'} />
        {selection.option && <Row label="Opção" value={selection.option.name} />}
        <Row
          label="Pix"
          value={selection.price ? formatBRL(effectivePix(selection.price)) : 'Preço ainda não cadastrado.'}
        />
        {selection.price && (
          <Row
            label="Cartão"
            value={`${formatBRL(effectiveCard(selection.price))} · até ${MAX_CARD_INSTALLMENTS}x de ${formatBRL(displayInstallment(effectiveCard(selection.price)))}`}
          />
        )}
        <Row label="Atendimento" value={`${SERVICE_MODE_LABEL.mobile} · Nós vamos até você.`} />
        <Row label="Cliente" value={customerName || '—'} />
        {phone != null && phone !== '' && <Row label="WhatsApp" value={phone} />}
        {addressLine != null && addressLine !== '' && <Row label="Endereço" value={addressLine} />}
        <Row label="Quando" value={`${formatDateBR(date) || '—'}${timeEnd ? ` · ${windowLabel(time, timeEnd)}` : time ? ` · ${time}` : ''}`} />
        {notes != null && notes.trim() !== '' && <Row label="Observações" value={notes.trim()} />}
      </dl>
    </div>
  );
}
