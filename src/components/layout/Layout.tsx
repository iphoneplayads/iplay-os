import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils/format';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-noite/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* mobile: logo grande + CTA largo (cabe sem overflow) */}
        <div className="py-4 sm:hidden">
          <Link to="/" aria-label="iPlay — início">
            <Logo height={96} />
          </Link>
          <Link
            to="/agendar"
            className="mt-3 flex min-h-[52px] items-center justify-center rounded-2xl bg-lima px-4 py-3 text-center font-bold text-noite transition hover:brightness-110 active:scale-[0.99]"
          >
            Ver preço e agendar
          </Link>
        </div>
        {/* desktop: linha única */}
        <div className="hidden h-28 items-center justify-between sm:flex">
          <Link to="/" aria-label="iPlay — início">
            <Logo height={104} />
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              to="/agendar"
              className="rounded-xl bg-lima px-5 py-2.5 font-bold text-noite transition hover:brightness-110 active:scale-[0.99]"
            >
              Ver preço e agendar
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-linha bg-noite">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-cinza sm:px-6">
        <Logo height={52} />
        <p className="mt-3 font-display font-extrabold text-gelo">
          Conserto de iPhone. <span className="text-lima">Onde você estiver.</span>
        </p>
        <p className="mt-1">Atendimento onde você estiver. Veja o preço antes de agendar.</p>
      </div>
    </footer>
  );
}

export function PublicLayout({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-noite">
      <Header />
      <main className={`mx-auto w-full px-4 pb-16 pt-6 sm:px-6 ${wide ? 'max-w-7xl' : 'max-w-3xl'}`}>{children}</main>
      <Footer />
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-xl px-3 py-2 text-sm font-semibold',
      isActive ? 'bg-lima text-noite' : 'text-cinza hover:bg-musgo hover:text-gelo',
    );
  const { mode, user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-noite">
      <header className="border-b border-linha bg-noite">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <Link to="/admin" className="mr-2" aria-label="iPlay OS Admin">
            <Logo height={26} />
          </Link>
          <NavLink to="/admin" end className={link}>Dashboard</NavLink>
          <NavLink to="/admin/agendamentos" className={link}>Agendamentos</NavLink>
          <NavLink to="/admin/precos" className={link}>Preços</NavLink>
          <NavLink to="/admin/servicos" className={link}>Serviços</NavLink>
          <NavLink to="/admin/modelos" className={link}>Modelos</NavLink>
          <Link to="/" className="ml-auto text-sm text-cinza hover:text-gelo">← Ver site</Link>
          {mode === 'supabase' && user && (
            <button
              onClick={() => void signOut().then(() => navigate('/admin/login'))}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-cinza hover:bg-musgo hover:text-gelo"
            >
              Sair
            </button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
