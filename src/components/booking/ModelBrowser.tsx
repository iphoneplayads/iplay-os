import { useMemo, useState } from 'react';
import type { DeviceModel } from '@/types/domain';
import { Input } from '@/components/ui/Input';
import { ModelSelector } from '@/components/booking/ModelSelector';
import { cn } from '@/lib/utils/format';

/**
 * Navegador de modelos: busca + famílias (iPhone 17 … 11) + grade.
 * Tudo vem do banco via props; nenhuma lista hardcoded.
 */
export function ModelBrowser({
  models,
  selectedId,
  onSelect,
}: {
  models: DeviceModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<string | null>(null);

  const families = useMemo(() => {
    const order = new Map<string, number>();
    for (const m of models) {
      const f = m.family ?? 'Outros';
      order.set(f, Math.min(order.get(f) ?? Number.POSITIVE_INFINITY, m.sort_order));
    }
    return [...order.entries()].sort((a, b) => a[1] - b[1]).map(([f]) => f);
  }, [models]);

  const q = query.trim().toLowerCase();
  const visible = q
    ? models.filter((m) => m.name.toLowerCase().includes(q))
    : family
      ? models.filter((m) => (m.family ?? 'Outros') === family)
      : models;

  return (
    <div>
      <Input
        label="Buscar seu iPhone"
        name="model-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Digite: iPhone 15 Pro Max"
        autoComplete="off"
      />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Famílias de iPhone">
        <button
          role="tab"
          aria-selected={family === null && q === ''}
          onClick={() => {
            setFamily(null);
            setQuery('');
          }}
          className={cn(
            'flex-none rounded-full border px-4 py-2 text-sm font-bold transition',
            family === null && q === ''
              ? 'border-lima bg-lima text-noite'
              : 'border-linha bg-musgo text-gelo',
          )}
        >
          Todos
        </button>
        {families.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={family === f && q === ''}
            onClick={() => {
              setFamily(f);
              setQuery('');
            }}
            className={cn(
              'flex-none rounded-full border px-4 py-2 text-sm font-bold transition',
              family === f && q === ''
                ? 'border-lima bg-lima text-noite'
                : 'border-linha bg-musgo text-gelo',
            )}
          >
            iPhone {f}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-cinza" aria-live="polite">
        {visible.length === 0
          ? 'Nenhum modelo encontrado. Tente outro termo.'
          : `${visible.length} ${visible.length === 1 ? 'modelo' : 'modelos'}`}
      </p>
      <div className="mt-2">
        <ModelSelector models={visible} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </div>
  );
}
