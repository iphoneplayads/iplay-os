import { PROBLEM_OPTIONS, SERVICE_SLUGS } from '@/config/constants';
import type { Service } from '@/types/domain';
import { cn } from '@/lib/utils/format';
import { BackGlassIcon, BatteryIcon, DiagnosticIcon, ScreenIcon } from '@/components/brand/icons';

const ICONS = {
  [SERVICE_SLUGS.screen]: ScreenIcon,
  [SERVICE_SLUGS.battery]: BatteryIcon,
  [SERVICE_SLUGS.backGlass]: BackGlassIcon,
  [SERVICE_SLUGS.frontGlass]: ScreenIcon,
  [SERVICE_SLUGS.other]: DiagnosticIcon,
};

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
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
      {PROBLEM_OPTIONS.map((p) => {
        const svc = bySlug.get(p.serviceSlug);
        if (!svc) return null;
        const active = svc.id === selectedId;
        const Icon = ICONS[p.serviceSlug] ?? DiagnosticIcon;
        return (
          <button
            key={svc.id}
            onClick={() => onSelect(svc.id)}
            aria-pressed={active}
            className={cn(
              'group flex min-h-[82px] min-w-0 items-center gap-2.5 rounded-2xl border px-3 py-4 text-left transition active:scale-[0.99] xl:px-4',
              active
                ? 'border-lima bg-lima text-noite'
                : 'border-linha bg-musgo text-gelo hover:border-lima',
            )}
          >
            <span className={cn(
              'inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl border [&>svg]:h-6 [&>svg]:w-6',
              active ? 'border-noite/20 bg-noite/10 text-noite' : 'border-linha bg-noite text-lima',
            )}>
              <Icon />
            </span>
            <span className="block min-w-0 font-display text-[13px] font-extrabold leading-tight sm:text-sm xl:text-[15px]">{p.serviceSlug === SERVICE_SLUGS.screen ? 'Tela quebrada' : p.serviceSlug === SERVICE_SLUGS.backGlass ? 'Vidro traseiro' : p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
