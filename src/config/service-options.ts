/**
 * Avaliações de apresentação das opções de serviço (ex.: telas).
 * Não existe campo adequado no banco para isso e a tarefa proíbe migration
 * só para estrelas — por isso ficam centralizadas aqui, por nome normalizado.
 * Opção sem entrada: sem estrelas (sem inventar dado).
 */
const RATINGS: Record<string, number> = {
  premium: 2.5,
  pro: 4,
  'original remanufaturada': 5,
};

export function getOptionRating(name: string): number | null {
  const value = RATINGS[name.trim().toLowerCase()];
  return typeof value === 'number' ? value : null;
}
