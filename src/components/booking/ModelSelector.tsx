import type { DeviceModel } from '@/types/domain';
import { cn } from '@/lib/utils/format';

export function ModelSelector({
  models,
  selectedId,
  onSelect,
}: {
  models: DeviceModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {models.map((m) => {
        const active = m.id === selectedId;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            aria-pressed={active}
            className={cn(
              'rounded-2xl border p-4 text-left transition active:scale-[0.99]',
              active
                ? 'border-lima bg-lima text-noite'
                : 'border-linha bg-musgo text-gelo hover:border-cinza',
            )}
          >
            <span className="block font-bold">{m.name}</span>
            <span className={cn('text-xs', active ? 'text-noite/70' : 'text-cinza')}>{m.year ?? ''}</span>
          </button>
        );
      })}
    </div>
  );
}
