import { CARD_PRICE_MARKUP_PERCENT, MAX_CARD_INSTALLMENTS } from '@/config/pricing';
import type { Price } from '@/types/domain';

/** Reais → centavos inteiros (único ponto de conversão; nunca float como autoridade). */
export function toCents(brl: number): number {
  return Math.round(brl * 100);
}

/** Centavos inteiros → reais. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Cartão automático: round(pixCents * 111 / 100) — aritmética inteira, resultado em centavos. */
export function cardCentsFromPixCents(pixCents: number): number {
  return Math.round((pixCents * (100 + CARD_PRICE_MARKUP_PERCENT)) / 100);
}

/** Cartão automático em reais, já arredondado em centavos. */
export function cardFromPix(pix: number): number {
  return fromCents(cardCentsFromPixCents(toCents(pix)));
}

/**
 * Pix efetivo de uma linha de preço.
 * Linhas antigas sem pix_price herdam `price` (compatibilidade, sem presumir nada).
 */
export function effectivePix(p: Pick<Price, 'price' | 'pix_price'>): number {
  return p.pix_price ?? p.price;
}

/**
 * Estado da origem do preço do cartão — REGRA CENTRAL, fonte única.
 * - LEGADO: card_price IS NULL (linha anterior ao recurso; `custom` é só DEFAULT
 *   e NÃO significa "automático +11%");
 * - AUTOMÁTICO: card_price IS NOT NULL e custom = false;
 * - PERSONALIZADO: card_price IS NOT NULL e custom = true.
 */
export type CardPriceState = 'legacy' | 'auto' | 'manual';

export function cardPriceState(p: Pick<Price, 'card_price' | 'card_price_custom'>): CardPriceState {
  if (p.card_price == null) return 'legacy';
  return p.card_price_custom ? 'manual' : 'auto';
}

/**
 * Cartão efetivo de uma linha de preço.
 * - AUTOMÁTICO/PERSONALIZADO → `card_price` gravado;
 * - LEGADO → `price` como está (NUNCA aplica +11% em leitura/histórico);
 * - o +11% só nasce no admin, ao cadastrar/editar conscientemente.
 */
export function effectiveCard(p: Pick<Price, 'price' | 'card_price'>): number {
  return p.card_price ?? p.price;
}

/** Parcela informativa: round(card/10) em centavos. O TOTAL é autoritativo, nunca a parcela. */
export function displayInstallment(cardTotal: number, count: number = MAX_CARD_INSTALLMENTS): number {
  return fromCents(Math.round(toCents(cardTotal) / count));
}

/** Normaliza qualquer valor para 2 casas via centavos inteiros. */
export function roundBRL(value: number): number {
  return fromCents(toCents(value));
}

export interface PriceSaveInput {
  /** Pix efetivo já validado (> 0). */
  pix: number;
  /** Número = definição manual; undefined/null = automático (ou manter). */
  cardPrice?: number | null;
  /** Força recálculo automático a partir do Pix. */
  cardAuto?: boolean;
  /** Estado atual da linha (update): preserva manual existente. */
  currentCustom?: boolean;
  currentCard?: number | null;
}

export interface ResolvedPriceSave {
  card: number;
  custom: boolean;
}

/**
 * Resolve cartão + flag de origem numa gravação (create/update, mock/Supabase).
 * - cardAuto → recalcula do Pix, custom=false;
 * - cardPrice número → manual, custom=true;
 * - senão, em update com manual existente → preserva;
 * - senão → automático do Pix, custom=false.
 * Pix alterado NUNCA sobrescreve cartão personalizado silenciosamente.
 */
export function resolvePriceSave(input: PriceSaveInput): ResolvedPriceSave {
  if (input.cardAuto) return { card: cardFromPix(input.pix), custom: false };
  if (typeof input.cardPrice === 'number') return { card: roundBRL(input.cardPrice), custom: true };
  if (input.currentCustom && input.currentCard != null) {
    return { card: input.currentCard, custom: true };
  }
  return { card: cardFromPix(input.pix), custom: false };
}
