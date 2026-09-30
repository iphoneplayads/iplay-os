import type { ServiceOption } from '@/types/domain';
import { cn } from '@/lib/utils/format';

export function ServiceOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: ServiceOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'w-full rounded-2xl border p-4 text-left transition active:scale-[0.99]',
        selected
          ? 'border-lima bg-lima text-noite'
          : 'border-linha bg-musgo text-gelo hover:border-cinza',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-display font-extrabold">{option.name}</span>
        {option.badge && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-bold',
              selected ? 'bg-noite text-lima' : 'bg-lima text-noite',
            )}
          >
            {option.badge}
          </span>
        )}
      </div>
      <p className={cn('mt-1 text-sm', selected ? 'text-noite/80' : 'text-nevoa')}>{option.description}</p>
      <p className={cn('mt-2 text-xs font-semibold', selected ? 'text-noite' : 'text-gelo')}>
        Garantia: {option.warranty_months} {option.warranty_months === 1 ? 'mês' : 'meses'}
      </p>
    </button>
  );
}
