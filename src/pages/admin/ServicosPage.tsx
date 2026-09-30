import { useEffect, useState } from 'react';
import { APP_CONFIG } from '@/config/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { getRepositories } from '@/repositories/factory';
import type { Service } from '@/types/domain';

export function AdminServicos() {
  const { push } = useToast();
  const [rows, setRows] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Service | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setError(null);
      setRows(await getRepositories().admin.listAllServices(APP_CONFIG.company.id));
    } catch (e) {
      console.error('[admin] serviços:', e);
      setError('Não foi possível carregar os serviços.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal(svc: Service | 'new') {
    setEditing(svc);
    setName(svc === 'new' ? '' : svc.name);
    setDescription(svc === 'new' ? '' : (svc.description ?? ''));
  }

  async function save() {
    if (!name.trim()) {
      push('Informe o nome do serviço.');
      return;
    }
    setSaving(true);
    try {
      const admin = getRepositories().admin;
      if (editing === 'new') {
        await admin.createService(APP_CONFIG.company.id, { name: name.trim(), description: description.trim() });
        push('Serviço criado.');
      } else if (editing) {
        await admin.updateService(APP_CONFIG.company.id, editing.id, { name: name.trim(), description: description.trim() });
        push('Serviço atualizado.');
      }
      setEditing(null);
      await load();
    } catch (e) {
      console.error('[admin] salvar serviço:', e);
      push(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(svc: Service) {
    try {
      await getRepositories().admin.updateService(APP_CONFIG.company.id, svc.id, { active: !svc.active });
      await load();
      push(svc.active ? 'Serviço desativado.' : 'Serviço ativado.');
    } catch (e) {
      console.error('[admin] toggle serviço:', e);
      push(e instanceof Error ? e.message : 'Não foi possível alterar.');
    }
  }

  if (loading) return <LoadingState message="Carregando serviços…" />;
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gelo">Serviços</h1>
          <p className="text-sm text-cinza">Preços ficam em Preços — nunca aqui. Desative em vez de excluir.</p>
        </div>
        <Button size="md" onClick={() => openModal('new')}>Novo</Button>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2">
        {rows.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 rounded-2xl bg-musgo p-4">
            <div>
              <p className="font-semibold text-gelo">{s.name} {!s.active && <span className="ml-1 rounded-full bg-noite px-2 py-0.5 text-xs text-cinza">inativo</span>}</p>
              <p className="font-mono text-xs text-cinza">{s.slug}</p>
            </div>
            <div className="flex gap-2">
              <Button size="md" variant="secondary" onClick={() => openModal(s)}>Editar</Button>
              <Button size="md" variant="secondary" onClick={() => void toggle(s)}>
                {s.active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <Modal title={editing === 'new' ? 'Novo serviço' : 'Editar serviço'} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 gap-3">
            <Input label="Nome" name="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Troca de tela" />
            <Input label="Descrição" name="svc-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição curta" />
            <Button fullWidth disabled={saving} onClick={() => void save()}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
