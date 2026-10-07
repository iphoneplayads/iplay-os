import type { Price, ServiceOption } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { formatBRL } from '@/lib/utils/format';
import { displayInstallment, effectiveCard, effectivePix } from '@/lib/pricing';
import { MAX_CARD_INSTALLMENTS } from '@/config/pricing';
import { getOptionRating } from '@/config/service-options';
import { cn } from '@/lib/utils/format';

/**
 * Card comparativo de opção com preço real + garantia + ação de escolha.
 * Preço ausente: informa e desabilita (nunca R$ 0, nunca valor inventado).
 */
function StarRating({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (filled: boolean) => (
    <span aria-hidden="true" className="flex w-max gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill={filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </span>
  );
  return (
    <span
      role="img"
      aria-label={`Avaliação ${String(value).replace('.', ',')} de 5 estrelas`}
      className="relative inline-flex align-middle text-cinza"
    >
      {row(false)}
      <span className="absolute inset-0 overflow-hidden text-lima" style={{ width: `${pct}%` }}>
        {row(true)}
      </span>
    </span>
  );
}

export function OptionPriceCard({
  option,
  price,
  loadingPrice,
  onChoose,
  choosing,
}: {
  option: ServiceOption;
  price: Price | null | undefined;
  loadingPrice: boolean;
  onChoose: () => void;
  choosing: boolean;
}) {
  const unavailable = !loadingPrice && price === null;
  const rating = getOptionRating(option.name);
  return (
    <div className="rounded-2xl border border-linha bg-musgo p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-display text-lg font-extrabold text-gelo">{option.name}</p>
          {rating != null && <StarRating value={rating} />}
        </div>
        {option.badge && (
          <span className="rounded-full bg-lima px-2 py-0.5 text-[11px] font-bold text-noite">
            {option.badge}
          </span>
        )}
      </div>
      {option.description && <p className="mt-1 text-sm text-nevoa">{option.description}</p>}
      {(() => {
        const key = option.name.trim().toLowerCase();
        const details =
          key === 'premium' ? ['Boa qualidade', 'Cores equilibradas', 'Toque responsivo'] :
          key === 'pro' ? ['Qualidade superior', 'Cores vivas e brilho forte', 'Toque muito próximo ao original'] :
          key === 'original remanufaturada' ? ['Peça original remanufaturada', 'Mesma qualidade de imagem e toque do original', 'Máxima fidelidade'] :
          [];
        return details.length ? (
          <ul className="mt-3 grid gap-1 text-xs text-nevoa sm:grid-cols-3">
            {details.map((item) => <li key={item} className="rounded-lg bg-noite px-2.5 py-2">✓ {item}</li>)}
          </ul>
        ) : null;
      })()}
      <p className="mt-3 text-xs font-semibold text-gelo">
        {option.warranty_months} {option.warranty_months === 1 ? 'mês' : 'meses'} de garantia
      </p>
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-linha pt-3">
        <div>
          {loadingPrice ? (
            <p className="text-sm text-cinza">Consultando…</p>
          ) : price ? (
            <>
              <p className="font-display text-2xl font-extrabold text-gelo">{formatBRL(effectivePix(price))} <span className="text-sm font-bold text-cinza">no Pix</span></p>
              <p className="text-xs text-cinza">
                {formatBRL(effectiveCard(price))} no cartão · até {MAX_CARD_INSTALLMENTS}x de {formatBRL(displayInstallment(effectiveCard(price)))} sem juros
              </p>
            </>
          ) : (
            <p className={cn('text-sm font-semibold text-cinza')}>Preço ainda não disponível online</p>
          )}
        </div>
        <Button size="md" disabled={unavailable || choosing} onClick={onChoose}>
          {choosing ? 'Aguarde…' : 'Escolher'}
        </Button>
      </div>
      {unavailable && (
        <p className="mt-2 text-xs text-cinza">Fale com a iPlay para consultar este serviço.</p>
      )}
    </div>
  );
}
