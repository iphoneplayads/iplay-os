export function LoadingState({ message = 'Carregando…' }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-linha bg-musgo p-4" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-linha border-t-lima" />
      <p className="text-sm text-cinza">{message}</p>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-linha bg-noite p-6 text-center">
      <p className="font-semibold text-gelo">{title}</p>
      {hint && <p className="mt-1 text-sm text-cinza">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-400/40 bg-red-950/40 p-6 text-center" role="alert">
      <p className="font-semibold text-red-200">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-xl border border-red-400/40 bg-noite px-4 py-2 text-sm font-semibold text-red-200">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
