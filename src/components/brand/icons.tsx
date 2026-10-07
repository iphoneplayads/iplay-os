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

/** Ícone do WhatsApp. */
export function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12.04 2C6.52 2 2.03 6.48 2.03 12c0 1.76.46 3.48 1.33 4.99L2 22l5.15-1.35A9.94 9.94 0 0 0 12.03 22h.01C17.56 22 22 17.52 22 12S17.56 2 12.04 2Zm5.83 14.13c-.25.71-1.47 1.36-2.03 1.45-.52.08-1.18.12-1.91-.12-.44-.14-1.01-.33-1.74-.65-3.06-1.32-5.05-4.4-5.2-4.6-.15-.2-1.24-1.65-1.24-3.15 0-1.5.78-2.24 1.06-2.55.28-.31.61-.39.82-.39h.59c.19 0 .44-.07.69.53.25.6.85 2.08.92 2.23.08.15.13.33.03.53-.1.2-.15.33-.3.51-.15.18-.32.4-.46.54-.15.15-.3.31-.13.61.18.3.78 1.28 1.67 2.07 1.15 1.02 2.12 1.34 2.42 1.49.3.15.48.13.66-.08.18-.2.76-.89.96-1.19.2-.3.41-.25.69-.15.28.1 1.78.84 2.08.99.3.15.51.23.58.35.08.13.08.73-.17 1.44Z"/>
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
