import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/format';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className, ...rest }: Props) {
  const inputId = id ?? rest.name;
  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1 block text-sm font-medium text-cinza">{label}</span>
      <input
        id={inputId}
        className={cn(
          'w-full rounded-xl border bg-noite px-4 py-3 text-base text-gelo outline-none transition placeholder:text-cinza/60',
          error ? 'border-red-400' : 'border-linha focus:border-lima',
          className,
        )}
        {...rest}
      />
      {error && <span className="mt-1 block text-sm text-red-400">{error}</span>}
    </label>
  );
}
