import type { Price } from '@/types/domain';
import { formatBRL } from '@/lib/utils/format';

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
  return (
    <div className="rounded-3xl bg-lima p-6 text-noite">
      <p className="text-sm font-medium text-noite/70">{title}</p>
      <p className="font-bold">{subtitle}</p>
      <p className="mt-4 font-display text-4xl font-extrabold tracking-tight">{formatBRL(price.price)}</p>
      {price.installment_count && price.installment_price && (
        <p className="mt-1 text-sm font-medium text-noite/70">
          ou até {price.installment_count}x de {formatBRL(price.installment_price)}
        </p>
      )}
      {price.pix_price && (
        <p className="mt-1 text-sm font-bold">{formatBRL(price.pix_price)} no Pix</p>
      )}
    </div>
  );
}
