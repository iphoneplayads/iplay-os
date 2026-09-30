import type { SVGProps } from 'react';

/**
 * Ícones iPlay — linguagem única: traço 1.8, cantos arredondados, currentColor.
 * Desenhados para a marca (fundo escuro + Lima). Sem dependências externas,
 * sem emojis. O CTA de WhatsApp usa o ChatIcon nesta mesma linguagem + rótulo
 * e link wa.me (comportamento entrega o reconhecimento; sem redesenho duvidoso
 * do glifo oficial).
 */
function Base({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function ScreenIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      {/* vidro trincado */}
      <path d="M12 5.5 10.4 9l1.7 2.1-1 3.4" />
      <path d="M12 5.5l2.4 2.6.6 3" />
      <line x1="11" y1="18.6" x2="13" y2="18.6" />
    </Base>
  );
}

export function BatteryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="2.5" y="8.5" width="16" height="8" rx="2" />
      <rect x="20.2" y="11" width="1.8" height="3" rx="0.9" fill="currentColor" stroke="none" />
      <path d="M12.8 9.8 10.4 13.2h1.9l-.9 2.4 3.1-4.2h-1.9z" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function BackGlassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="7" y="2.5" width="10" height="19" rx="3" />
      <rect x="9.2" y="5" width="4.6" height="4.6" rx="1.4" />
      <circle cx="10.8" cy="6.7" r="0.9" />
      <circle cx="12.2" cy="8.3" r="0.2" />
      {/* trinca na traseira */}
      <path d="M14.5 12.5 12.8 15.5l1.4 2.4-1.2 2.6" />
    </Base>
  );
}

export function DiagnosticIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <line x1="15.8" y1="15.8" x2="20.5" y2="20.5" />
      <path d="M12 8.2 10.2 11h1.6l-.8 2.2 2.6-3.4h-1.6z" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function PinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.3" />
    </Base>
  );
}

export function TagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 4h6.5L20 13.5 13.5 20 4 10.5z" />
      <circle cx="8.5" cy="8.5" r="1.4" />
    </Base>
  );
}

export function BoltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M13 2.5 5 13.5h5L10.5 21.5 19 10h-5z" />
    </Base>
  );
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 2.8 19 5.5v6c0 4.5-3 7.8-7 9.7-4-1.9-7-5.2-7-9.7v-6z" />
      <path d="M9 11.5l2.2 2.2 4.3-4.2" />
    </Base>
  );
}

export function CardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <line x1="2.5" y1="10" x2="21.5" y2="10" />
      <line x1="6" y1="14.5" x2="10" y2="14.5" />
    </Base>
  );
}

export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3.5" y="4.5" width="17" height="11" rx="2.5" />
      <path d="M8 15.5 6.5 19.5 11 15.5" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <line x1="3.5" y1="9.7" x2="20.5" y2="9.7" />
      <line x1="8" y1="2.5" x2="8" y2="6" />
      <line x1="16" y1="2.5" x2="16" y2="6" />
    </Base>
  );
}

export function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3l1.8 5.7 5.7 1.8-5.7 1.8L12 18l-1.8-5.7L4.5 10.5l5.7-1.8z" />
    </Base>
  );
}

/** Receptor telefônico (CTA WhatsApp) — preenchido, cor via currentColor. */
export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6.6 10.8c1.5 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.5 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.3 1z" />
    </svg>
  );
}

/** Moldura padrão dos ícones: chip Musgo, borda linha, glifo Lima. */
export function IconChip({
  children,
  size = 48,
  className = '',
}: {
  children: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`inline-flex flex-none items-center justify-center rounded-2xl border border-linha bg-noite text-lima [&>svg]:h-1/2 [&>svg]:w-1/2 ${className}`}
    >
      {children}
    </span>
  );
}
