import { Link } from 'react-router-dom';

/** Primitivos visuais das landings SEO — mesmas classes/estética da Home. */

export function SeoEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-lima">
      <span aria-hidden="true" className="h-px w-8 bg-lima" />
      {children}
    </p>
  );
}

export function SeoH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 font-display text-3xl font-extrabold text-gelo sm:text-4xl">{children}</h2>
  );
}

export function SeoLead({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-base text-cinza">{children}</p>;
}

export function SeoCta({ to, children, variant = 'primary' }: { to: string; children: React.ReactNode; variant?: 'primary' | 'secondary' }) {
  if (variant === 'secondary') {
    return (
      <Link
        to={to}
        className="inline-block rounded-2xl border border-linha bg-noite px-6 py-3.5 text-center font-semibold text-gelo transition hover:border-cinza"
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      to={to}
      className="inline-block rounded-2xl bg-lima px-6 py-3.5 text-center font-bold text-noite transition hover:brightness-110 active:scale-[0.99]"
    >
      {children}
    </Link>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Você está aqui">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-cinza">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">›</span>}
            {item.href ? (
              <Link to={item.href} className="text-lima hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-nevoa">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface FaqItem {
  q: string;
  a: string;
}

/** FAQ visível e semântico (details/summary). Sem FAQPage JSON-LD nesta fase. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mt-6 divide-y divide-linha rounded-3xl border border-linha bg-musgo px-6 sm:px-8">
      {items.map((item) => (
        <details key={item.q} className="group py-5">
          <summary className="cursor-pointer list-none font-display text-base font-extrabold text-gelo marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-4">
              {item.q}
              <span aria-hidden="true" className="font-bold text-lima transition group-open:rotate-45">+</span>
            </span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-nevoa">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export interface Step {
  n: string;
  title: string;
  text: string;
}

export function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((step) => (
        <li key={step.n} className="rounded-3xl border border-linha bg-musgo p-5">
          <p className="font-display text-sm font-extrabold text-lima">{step.n}</p>
          <p className="mt-1 font-display text-base font-extrabold text-gelo">{step.title}</p>
          <p className="mt-1 text-sm text-cinza">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
