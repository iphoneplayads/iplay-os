import { BOOKING_STEPS } from '@/config/app';
import type { BookingStepId } from '@/types/booking';
import { cn } from '@/lib/utils/format';

export function ProgressIndicator({ current }: { current: BookingStepId }) {
  const idx = BOOKING_STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center gap-1" aria-label="Progresso">
      {BOOKING_STEPS.map((s, i) => (
        <li key={s.id} className="flex-1">
          <div
            className={cn(
              'h-1.5 rounded-full',
              i <= idx ? 'bg-lima' : 'bg-linha',
            )}
          />
          <p className={cn('mt-1 hidden text-center text-[11px] sm:block', i === idx ? 'font-bold text-gelo' : 'text-cinza')}>
            {s.label}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function BookingStep({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4">
      <h2 className="font-display text-xl font-extrabold tracking-tight text-gelo">{title}</h2>
      {hint && <p className="mt-1 text-sm text-cinza">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
