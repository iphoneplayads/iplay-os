import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LoadingState } from '@/components/ui/States';

/** Guarda /admin/*: sem sessão de admin → /admin/login (no mock, acesso liberado p/ dev). */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { mode, user, isAdmin, loading } = useAuth();
  if (mode === 'mock') return <>{children}</>;
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <LoadingState message="Verificando acesso…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/admin/negado" replace />;
  return <>{children}</>;
}

/** Sessão existe mas sem role admin: acesso negado explícito (não redireciona em loop). */
export function AdminDenied() {
  const { signOut } = useAuth();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="rounded-3xl border border-linha bg-musgo p-8">
        <h1 className="font-display text-xl font-extrabold text-gelo">Sem permissão</h1>
        <p className="mt-2 text-sm text-cinza">
          Esta conta não possui perfil de administrador. Fale com o responsável.
        </p>
        <button
          onClick={() => void signOut()}
          className="mt-4 rounded-xl bg-lima px-4 py-2 text-sm font-bold text-noite"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
