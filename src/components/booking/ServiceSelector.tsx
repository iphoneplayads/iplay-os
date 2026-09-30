import { PROBLEM_OPTIONS } from '@/config/constants';
import type { Service } from '@/types/domain';
import { cn } from '@/lib/utils/format';

export function ServiceSelector({
  services,
  selectedId,
  onSelect,
}: {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const bySlug = new Map(services.map((s) => [s.slug, s]));
  return (
    <div className="grid grid-cols-1 gap-2">
      {PROBLEM_OPTIONS.map((p) => {
        const svc = bySlug.get(p.serviceSlug);
        if (!svc) return null;
        const active = svc.id === selectedId;
        return (
          <button
            key={svc.id}
            onClick={() => onSelect(svc.id)}
            aria-pressed={active}
            className={cn(
              'rounded-2xl border p-4 text-left transition active:scale-[0.99]',
              active
                ? 'border-lima bg-lima text-noite'
                : 'border-linha bg-musgo text-gelo hover:border-cinza',
            )}
          >
            <span className="block font-bold">{p.label}</span>
            <span className={cn('text-xs', active ? 'text-noite/70' : 'text-cinza')}>{svc.name}</span>
          </button>
        );
      })}
    </div>
  );
}
