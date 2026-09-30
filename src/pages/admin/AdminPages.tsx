import { useEffect, useState } from 'react';
import { APP_CONFIG } from '@/config/app';
import { AdminCard } from '@/components/admin/AdminCard';
import { LoadingState } from '@/components/ui/States';
import { getRepositories } from '@/repositories/factory';

export function AdminDashboard() {
  const [counts, setCounts] = useState({ prices: 0, appointments: 0, services: 0, models: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const repos = getRepositories();
      const [prices, appts, services, models] = await Promise.all([
        repos.catalog.listPrices(APP_CONFIG.company.id),
        repos.booking.listAppointments(APP_CONFIG.company.id),
        repos.catalog.listServices(APP_CONFIG.company.id),
        repos.catalog.listModels(APP_CONFIG.company.id),
      ]);
      setCounts({ prices: prices.length, appointments: appts.length, services: services.length, models: models.length });
      setLoading(false);
    })();
  }, []);
  if (loading) return <LoadingState message="Carregando dashboard…" />;
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-gelo">Dashboard</h1>
      <p className="text-sm text-cinza">Tenant: {APP_CONFIG.company.name}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminCard title="Agendamentos" value={`${counts.appointments}`} hint="Ver agendamentos" to="/admin/agendamentos" />
        <AdminCard title="Preços" value={`${counts.prices}`} hint="Gerenciar preços" to="/admin/precos" />
        <AdminCard title="Serviços" value={`${counts.services}`} hint="Gerenciar serviços" to="/admin/servicos" />
        <AdminCard title="Modelos" value={`${counts.models}`} hint="Gerenciar modelos" to="/admin/modelos" />
      </div>
    </div>
  );
}
