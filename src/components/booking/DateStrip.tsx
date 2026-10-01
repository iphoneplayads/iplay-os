import type { CalendarDay } from '@/lib/scheduling';
import { cn } from '@/lib/utils/format';

/**
 * Faixa de dias (scroll horizontal no mobile). Domingos desabilitados ("Fechado").
 * Rótulos HOJE / AMANHÃ / dia da semana + número + mês.
 */
export function DateStrip({
  days,
  selected,
  onSelect,
}: {
  days: CalendarDay[];
  selected: string;
  onSelect: (dateISO: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" role="listbox" aria-label="Escolha o dia">
      {days.map((d) => {
        const active = d.dateISO === selected;
        const label = d.isToday ? 'HOJE' : d.isTomorrow ? 'AMANHÃ' : d.weekdayLabel;
        return (
          <button
            key={d.dateISO}
            role="option"
            aria-selected={active}
            disabled={d.closed}
            onClick={() => onSelect(d.dateISO)}
            className={cn(
              'flex min-h-[76px] w-[68px] flex-none flex-col items-center justify-center rounded-2xl border transition active:scale-[0.97]',
              'disabled:cursor-not-allowed disabled:opacity-40',
              active
                ? 'border-lima bg-lima text-noite'
                : 'border-linha bg-musgo text-gelo enabled:hover:border-cinza',
            )}
          >
            <span className={cn('text-[11px] font-bold', active ? 'text-noite/70' : 'text-cinza')}>
              {d.closed ? 'FECHADO' : label}
            </span>
            <span className="font-display text-xl font-extrabold leading-tight">{d.dayNumber}</span>
            <span className={cn('text-[11px] font-bold', active ? 'text-noite/70' : 'text-cinza')}>
              {d.monthLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
