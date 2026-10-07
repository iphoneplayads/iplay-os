import type { BookingStepId } from '@/types/booking';
import type { DeviceModel, Price, Service, ServiceOption } from '@/types/domain';
import { formatBRL } from '@/lib/utils/format';
import { displayInstallment, effectiveCard, effectivePix } from '@/lib/pricing';
import { MAX_CARD_INSTALLMENTS } from '@/config/pricing';

export interface QuoteSelection {
  model: DeviceModel | null;
  service: Service | null;
  option: ServiceOption | null;
  price: Price | null;
  warrantyLabel: string | null;
}

/** Resumo fixo do orçamento (desktop: lateral fixa; mobile: antes do CTA). */
export function QuoteAside({
  selection,
  onEdit,
  compact,
}: {
  selection: QuoteSelection;
  onEdit: (step: BookingStepId) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'rounded-2xl border border-linha bg-musgo p-4 text-sm' : 'sticky top-24 rounded-2xl border border-linha bg-musgo p-4 text-sm'}>
      <p className="font-display font-extrabold text-gelo">Seu orçamento</p>
      <dl className="mt-2 space-y-1.5 text-nevoa">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-cinza">iPhone</dt>
          <dd className="text-right">
            <span className="font-semibold text-gelo">{selection.model?.name ?? '—'}</span>{' '}
            <EditButton onClick={() => onEdit('model')} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-cinza">Serviço</dt>
          <dd className="text-right">
            <span className="font-semibold text-gelo">{selection.service?.name ?? '—'}</span>{' '}
            <EditButton onClick={() => onEdit('service')} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-cinza">Opção</dt>
          <dd className="text-right">
            <span className="font-semibold text-gelo">{selection.option?.name ?? '—'}</span>{' '}
            <EditButton onClick={() => onEdit('option')} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-linha pt-2">
          <dt className="text-cinza">Cartão</dt>
          <dd className="text-right font-display text-base font-extrabold text-gelo">
            {selection.price
              ? `${MAX_CARD_INSTALLMENTS}x de ${formatBRL(displayInstallment(effectiveCard(selection.price)))}`
              : '—'}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="pt-0.5 text-cinza">PIX</dt>
          <dd className="max-w-[175px] text-right text-sm font-bold text-lima">
            {selection.price ? <>{formatBRL(effectivePix(selection.price))}<span className="block text-[11px] font-semibold text-cinza">com desconto no PIX</span></> : '—'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-cinza">Garantia</dt>
          <dd className="text-right font-semibold text-gelo">{selection.warrantyLabel ?? '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs font-bold text-lima underline underline-offset-2">
      Alterar
    </button>
  );
}
