import { useEffect, useState } from 'react';
import { APP_CONFIG } from '@/config/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { getRepositories } from '@/repositories/factory';
import type { DeviceModel } from '@/types/domain';

export function AdminModelos() {
  const { push } = useToast();
  const [rows, setRows] = useState<DeviceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DeviceModel | 'new' | null>(null);
  const [name, setName] = useState('');
  const [family, setFamily] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setError(null);
      setRows(await getRepositories().admin.listAllModels(APP_CONFIG.company.id));
    } catch (e) {
      console.error('[admin] modelos:', e);
      setError('Não foi possível carregar os modelos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal(m: DeviceModel | 'new') {
    setEditing(m);
    setName(m === 'new' ? '' : m.name);
    setFamily(m === 'new' ? '' : (m.family ?? ''));
    setYear(m === 'new' ? '' : (m.year != null ? String(m.year) : ''));
  }

  async function save() {
    if (!name.trim()) {
      push('Informe o nome do modelo.');
      return;
    }
    const parsedYear = year.trim() === '' ? null : Number(year);
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 2007 || parsedYear > 2100)) {
      push('Ano inválido.');
      return;
    }
    setSaving(true);
    try {
      const admin = getRepositories().admin;
      const payload = { name: name.trim(), family: family.trim(), year: parsedYear };
      if (editing === 'new') {
        await admin.createModel(APP_CONFIG.company.id, payload);
        push('Modelo criado.');
      } else if (editing) {
        await admin.updateModel(APP_CONFIG.company.id, editing.id, payload);
        push('Modelo atualizado.');
      }
      setEditing(null);
      await load();
    } catch (e) {
      console.error('[admin] salvar modelo:', e);
      push(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(m: DeviceModel) {
    try {
      await getRepositories().admin.updateModel(APP_CONFIG.company.id, m.id, { active: !m.active });
      await load();
      push(m.active ? 'Modelo desativado.' : 'Modelo ativado.');
    } catch (e) {
      console.error('[admin] toggle modelo:', e);
      push(e instanceof Error ? e.message : 'Não foi possível alterar.');
    }
  }

  if (loading) return <LoadingState message="Carregando modelos…" />;
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gelo">Modelos</h1>
          <p className="text-sm text-cinza">Lista dinâmica do /agendar. Desative em vez de excluir.</p>
        </div>
        <Button size="md" onClick={() => openModal('new')}>Novo</Button>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 rounded-2xl bg-musgo p-4">
            <div>
              <p className="font-semibold text-gelo">{m.name} {!m.active && <span className="ml-1 rounded-full bg-noite px-2 py-0.5 text-xs text-cinza">inativo</span>}</p>
              <p className="text-xs text-cinza">{m.family ?? ''} {m.year ?? ''}</p>
            </div>
            <div className="flex gap-2">
              <Button size="md" variant="secondary" onClick={() => openModal(m)}>Editar</Button>
              <Button size="md" variant="secondary" onClick={() => void toggle(m)}>
                {m.active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing === 'new' ? 'Novo modelo' : 'Editar modelo'} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 gap-3">
            <Input label="Nome" name="model-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="iPhone 18" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Família" name="model-family" value={family} onChange={(e) => setFamily(e.target.value)} placeholder="18" />
              <Input label="Ano" name="model-year" value={year} inputMode="numeric" onChange={(e) => setYear(e.target.value)} placeholder="2026" />
            </div>
            <Button fullWidth disabled={saving} onClick={() => void save()}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
