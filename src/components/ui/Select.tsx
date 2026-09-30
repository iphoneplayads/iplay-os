import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/format';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function Select({ label, error, id, className, children, ...rest }: Props) {
  const selectId = id ?? rest.name;
  return (
    <label className="block" htmlFor={selectId}>
      <span className="mb-1 block text-sm font-medium text-cinza">{label}</span>
      <select
        id={selectId}
        className={cn(
          'w-full rounded-xl border bg-noite px-4 py-3 text-base text-gelo outline-none',
          error ? 'border-red-400' : 'border-linha focus:border-lima',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-sm text-red-400">{error}</span>}
    </label>
  );
}
