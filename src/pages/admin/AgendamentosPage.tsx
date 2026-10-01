import { useEffect, useMemo, useState } from 'react';
import { APP_CONFIG } from '@/config/app';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ALLOWED_TRANSITIONS } from '@/lib/booking/transitions';
import { formatBRL, formatDateBR } from '@/lib/utils/format';
import { getRepositories } from '@/repositories/factory';
import type { DetailedAppointment } from '@/repositories/admin.repository';
import type { AppointmentStatus } from '@/types/domain';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  requested: 'Solicitado',
  pending: 'Pendente',
  confirmed: 'Confirmado',
  in_progress: 'Em atendimento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Faltou',
};

const FILTERS: Array<{ value: '' | AppointmentStatus; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'requested', label: 'Solicitado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'in_progress', label: 'Em atendimento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
];

const onlyDigits = (v: string) => v.replace(/\D/g, '');

export function AdminAgendamentos() {
  const { push } = useToast();
  const [rows, setRows] = useState<DetailedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | AppointmentStatus>('');
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const data = await getRepositories().admin.listDetailedAppointments(APP_CONFIG.company.id);
      setRows(data);
    } catch (e) {
      console.error('[admin] agendamentos:', e);
      setError('Não foi possível carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(search);
    return rows.filter((r) => {
      if (status && r.appointment.status !== status) return false;
      if (!q) return true;
      return (
        (r.appointment.protocol ?? '').toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        (qDigits !== '' && onlyDigits(r.clientPhone).includes(qDigits))
      );
    });
  }, [rows, search, status]);

  async function changeStatus(row: DetailedAppointment, next: AppointmentStatus) {
    if (next === row.appointment.status) return;
    setSavingId(row.appointment.id);
    try {
      const updated = await getRepositories().admin.updateAppointmentStatus(
        APP_CONFIG.company.id, row.appointment.id, next,
      );
      setRows((prev) => prev.map((r) => (r.appointment.id === updated.id ? { ...r, appointment: updated } : r)));
      push(`Agendamento ${updated.protocol ?? ''} → ${STATUS_LABELS[next]}.`);
    } catch (e) {
      console.error('[admin] status:', e);
      push(e instanceof Error ? e.message : 'Não foi possível alterar o status.');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <LoadingState message="Carregando agendamentos…" />;
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-gelo">Agendamentos</h1>
      <p className="text-sm text-cinza">Mais recentes primeiro · transições validadas.</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Buscar" name="search" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Protocolo, nome ou telefone" />
        <Select label="Status" name="status" value={status}
          onChange={(e) => setStatus(e.target.value as '' | AppointmentStatus)}>
          {FILTERS.map((f) => (
            <option key={f.label} value={f.value}>{f.label}</option>
          ))}
        </Select>
      </div>
      {filtered.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-linha bg-noite p-6 text-center text-sm text-cinza">
          Nenhum agendamento encontrado.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3">
          {filtered.map((r) => {
            const a = r.appointment;
            const nexts = ALLOWED_TRANSITIONS[a.status] ?? [];
            // Histórico prioriza o snapshot congelado; fallback legado.
            const shownValue = r.quotedCardTotal ?? r.priceValue;
            return (
              <li key={a.id} className="rounded-2xl bg-musgo p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-lima">{a.protocol ?? a.id.slice(0, 12)}</span>
                  <select
                    aria-label="Alterar status"
                    disabled={savingId === a.id || nexts.length === 0}
                    value={a.status}
                    onChange={(e) => void changeStatus(r, e.target.value as AppointmentStatus)}
                    className="rounded-xl border border-linha bg-noite px-2 py-1.5 text-xs font-semibold text-gelo"
                  >
                    <option value={a.status}>{STATUS_LABELS[a.status]}</option>
                    {nexts.map((n) => (
                      <option key={n} value={n}>→ {STATUS_LABELS[n]}</option>
                    ))}
                  </select>
                </div>
                <dl className="mt-2 space-y-0.5 text-nevoa">
                  <div className="flex justify-between gap-2"><dt className="text-cinza">Cliente</dt><dd className="font-semibold text-gelo">{r.clientName} · {r.clientPhone}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-cinza">Aparelho</dt><dd className="font-semibold text-gelo">{r.modelName}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-cinza">Serviço</dt><dd className="font-semibold text-gelo">{r.serviceName}{r.optionName ? ` · ${r.optionName}` : ''}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-cinza">Valor</dt><dd className="font-semibold text-gelo">{shownValue != null ? formatBRL(shownValue) : '—'}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-cinza">Quando</dt><dd className="font-semibold text-gelo">{formatDateBR(a.scheduled_date)} às {a.scheduled_start_time}</dd></div>
                  {r.addressLine !== '' && <div className="flex justify-between gap-2"><dt className="text-cinza">Endereço</dt><dd className="text-right font-semibold text-gelo">{r.addressLine}</dd></div>}
                  {a.notes && <div className="flex justify-between gap-2"><dt className="text-cinza">Obs.</dt><dd className="text-right font-semibold text-gelo">{a.notes}</dd></div>}
                  <div className="flex justify-between gap-2 text-xs text-cinza"><dt>Criado em</dt><dd>{new Date(a.created_at).toLocaleString('pt-BR')}</dd></div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
