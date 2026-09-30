/**
 * Prova social do Google.
 * Sem valores: estrutura vazia ("em breve") — NENHUMA nota ou contagem inventada.
 * Com valores reais (rating/count/url): bloco compacto premium, sem iframe,
 * sem chamadas externas. Link abre em nova aba.
 */
export function GoogleProof({
  rating,
  count,
  url,
}: {
  rating?: number;
  count?: number;
  url?: string;
}) {
  const empty = rating == null || count == null;
  const ratingText =
    rating != null ? rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) : null;
  return (
    <div className="mt-6 border-t border-linha pt-5">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-linha bg-noite font-display text-xl font-extrabold text-gelo"
        >
          G
        </span>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            {!empty && (
              <span className="font-display text-3xl font-extrabold text-gelo">{ratingText}</span>
            )}
            <span className="flex gap-0.5 text-lima" role="img" aria-label={empty ? 'Sem avaliação ainda' : `Nota ${ratingText} de 5`}>
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} viewBox="0 0 24 24" className="h-4 w-4" fill={empty ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
                  <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
                </svg>
              ))}
            </span>
          </div>
          {empty ? (
            <p className="mt-1 text-xs text-cinza">Em breve: avaliação real do Google</p>
          ) : (
            <p className="mt-1 text-xs text-cinza">
              {ratingText} de 5 · {count} avaliações no Google{' '}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold text-gelo underline underline-offset-2 hover:text-lima">
                  Ver avaliações →
                </a>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
