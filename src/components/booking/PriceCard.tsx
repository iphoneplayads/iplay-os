import type { Price } from '@/types/domain';
import { formatBRL } from '@/lib/utils/format';
import { displayInstallment, effectiveCard, effectivePix } from '@/lib/pricing';
import { MAX_CARD_INSTALLMENTS } from '@/config/pricing';

/** Padrão "post" do guia: cartão Lima com texto Noite para o valor de conversão. */
export function PriceCard({
  title,
  subtitle,
  price,
}: {
  title: string;
  subtitle: string;
  price: Price | null;
}) {
  if (!price) {
    return (
      <div className="rounded-3xl border border-linha bg-musgo p-6 text-gelo">
        <p className="text-sm text-cinza">{title}</p>
        <p className="font-semibold">{subtitle}</p>
        <p className="mt-4 font-display text-lg font-extrabold">Preço ainda não cadastrado.</p>
        <p className="mt-1 text-sm text-cinza">Fale com a iPlay para confirmar o valor deste modelo.</p>
      </div>
    );
  }
  const pix = effectivePix(price);
  const card = effectiveCard(price);
  return (
    <div className="rounded-3xl bg-lima p-6 text-noite">
      <p className="text-sm font-medium text-noite/70">{title}</p>
      <p className="font-bold">{subtitle}</p>
      <p className="mt-4 font-display text-4xl font-extrabold tracking-tight">{formatBRL(pix)} no Pix</p>
      <p className="mt-2 text-base font-bold">
        {formatBRL(card)} no cartão
      </p>
      <p className="text-sm font-medium text-noite/70">
        até {MAX_CARD_INSTALLMENTS}x de {formatBRL(displayInstallment(card))} sem juros
      </p>
    </div>
  );
}
