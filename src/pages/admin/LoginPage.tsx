import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const { mode, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (mode === 'mock') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-3xl border border-linha bg-musgo p-8">
          <div className="flex justify-center"><Logo height={36} /></div>
          <h1 className="mt-4 font-display text-xl font-extrabold text-gelo">Modo desenvolvimento</h1>
          <p className="mt-2 text-sm text-cinza">
            Backend mock ativo — login real indisponível. Configure o Supabase
            (<code>VITE_USE_MOCK=false</code>) para exigir autenticação.
          </p>
          <Button fullWidth className="mt-4" onClick={() => navigate('/admin/agendamentos')}>
            Entrar no painel (dev)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-linha bg-musgo p-6">
        <Logo height={34} />
        <h1 className="mt-4 font-display text-2xl font-extrabold text-gelo">Entrar</h1>
        <p className="text-sm text-cinza">iPlay OS · Admin</p>
        <form
          className="mt-4 grid grid-cols-1 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!email.trim() || !password) {
              setError('Informe e-mail e senha.');
              return;
            }
            setBusy(true);
            signIn(email.trim(), password)
              .then(() => navigate('/admin/agendamentos'))
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
              })
              .finally(() => setBusy(false));
          }}
        >
          <Input label="E-mail" name="email" type="email" autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Senha" name="password" type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm font-medium text-red-400" role="alert">{error}</p>}
          <Button type="submit" fullWidth disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <Link to="/" className="mt-4 block text-center text-sm text-cinza hover:text-gelo">← Voltar ao site</Link>
      </div>
    </div>
  );
}
