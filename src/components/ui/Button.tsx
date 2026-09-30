import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark';
type Size = 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  // Lima é ação principal; texto sobre lima é sempre Noite.
  primary: 'bg-lima text-noite hover:brightness-110 active:scale-[0.99]',
  secondary: 'bg-transparent text-gelo border border-linha hover:bg-musgo',
  ghost: 'bg-transparent text-cinza hover:bg-musgo hover:text-gelo',
  dark: 'bg-musgo text-gelo border border-linha hover:border-cinza',
};

export function Button({ variant = 'primary', size = 'lg', fullWidth, className, ...rest }: Props) {
  return (
    <button
      className={cn(
        'rounded-2xl font-bold transition disabled:cursor-not-allowed disabled:opacity-50',
        'min-h-[52px] px-6 text-base',
        size === 'md' && 'min-h-[44px] px-4 text-sm',
        fullWidth && 'w-full',
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
