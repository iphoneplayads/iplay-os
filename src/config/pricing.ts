/**
 * Regras comerciais de preço — FONTE ÚNICA.
 * Pix = valor à vista. Cartão = Pix + markup, em até MAX_CARD_INSTALLMENTS sem juros.
 * Nenhum outro arquivo deve conter 11, 1.11 ou 10 relacionados a preço.
 */
export const CARD_PRICE_MARKUP_PERCENT = 11;
export const MAX_CARD_INSTALLMENTS = 10;
