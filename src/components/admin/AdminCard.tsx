import { Link } from 'react-router-dom';

/** Card de navegação do admin (componente reutilizável — §23/§16: components/admin/). */
export function AdminCard({
  title,
  value,
  hint,
  to,
}: {
  title: string;
  value: string;
  hint: string;
  to: string;
}) {
  return (
    <Link to={to} className="rounded-2xl bg-musgo p-4 transition hover:border hover:border-cinza border border-transparent">
      <p className="text-sm text-cinza">{title}</p>
      <p className="font-display text-2xl font-extrabold text-gelo">{value}</p>
      <p className="text-xs text-cinza">{hint}</p>
    </Link>
  );
}
