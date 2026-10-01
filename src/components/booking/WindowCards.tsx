import type { DayWindow } from '@/services/availability.service';
import { cn } from '@/lib/utils/format';

/**
 * Janelas de atendimento em cards grandes (mobile-first).
 * Ocupadas: desabilitadas com "Indisponível" (sem sumir, sem expor terceiros).
 */
export function WindowCards({
  windows,
  selectedStart,
  onSelect,
}: {
  windows: DayWindow[];
  selectedStart: string;
  onSelect: (start: string, end: string) => void;
}) {
  if (windows.length === 0) {
    return (
      <p className="rounded-2xl border border-linha bg-musgo p-4 text-center text-sm text-cinza">
        Nenhuma janela disponível neste dia.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2" role="listbox" aria-label="Escolha uma janela">
      {windows.map((w) => {
        const active = w.start === selectedStart;
        const taken = w.state === 'taken';
        return (
          <button
            key={w.start}
            role="option"
            aria-selected={active}
            disabled={taken}
            onClick={() => onSelect(w.start, w.end)}
            className={cn(
              'flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border px-5 transition active:scale-[0.99]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              active
                ? 'border-lima bg-lima text-noite'
                : 'border-linha bg-musgo text-gelo enabled:hover:border-cinza',
            )}
          >
            <span className="font-display text-lg font-extrabold">{w.label}</span>
            {taken ? (
              <span className="rounded-full border border-linha px-3 py-1 text-xs font-bold text-cinza">
                Indisponível
              </span>
            ) : (
              <span className={cn('text-xs font-bold', active ? 'text-noite/70' : 'text-lima')}>
                {active ? 'Selecionada' : 'Janela de atendimento'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
