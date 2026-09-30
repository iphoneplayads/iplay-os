import { useEffect, useState } from 'react';
import { APP_CONFIG } from '@/config/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { formatBRL, parseBRLInput } from '@/lib/utils/format';
import { getRepositories } from '@/repositories/factory';
import type { DeviceModel, Price, Service, ServiceOption } from '@/types/domain';

export function AdminPrecos() {
  const { push } = useToast();
  const [prices, setPrices] = useState<Price[]>([]);
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [allOptions, setAllOptions] = useState<ServiceOption[]>([]);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<{ price: Price | null } | null>(null);
  const [modelId, setModelId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [optionId, setOptionId] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setError(null);
      const repos = getRepositories();
      const [p, m, s, o] = await Promise.all([
        repos.admin.listAllPrices(APP_CONFIG.company.id),
        repos.admin.listAllModels(APP_CONFIG.company.id),
        repos.admin.listAllServices(APP_CONFIG.company.id),
        repos.admin.listAllOptions(APP_CONFIG.company.id),
      ]);
      setPrices(p);
      setModels(m);
      setServices(s);
      setAllOptions(o);
    } catch (e) {
      console.error('[admin] preços:', e);
      setError('Não foi possível carregar os preços.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openModal(price: Price | null) {
    setModal({ price });
    const mId = price?.model_id ?? '';
    const sId = price?.service_id ?? '';
    setModelId(mId);
    setServiceId(sId);
    setOptionId(price?.service_option_id ?? '');
    setValue(price ? String(Number(price.price)) : '');
    setOptions(sId ? allOptions.filter((o) => o.service_id === sId) : []);
  }

  function onServiceChange(sId: string) {
    setServiceId(sId);
    setOptionId('');
    setOptions(sId ? allOptions.filter((o) => o.service_id === sId) : []);
  }

  async function save() {
    const parsed = parseBRLInput(value);
    if (!modelId || !serviceId) {
      push('Selecione modelo e serviço.');
      return;
    }
    if (parsed === null) {
      push('Informe um preço válido maior que zero (ex.: 599,90).');
      return;
    }
    setSaving(true);
    try {
      const admin = getRepositories().admin;
      if (modal?.price) {
        await admin.updatePrice(APP_CONFIG.company.id, modal.price.id, { value: parsed });
        push('Preço atualizado.');
      } else {
        await admin.createPrice(APP_CONFIG.company.id, {
          modelId, serviceId, serviceOptionId: optionId || null, value: parsed,
        });
        push('Preço criado.');
      }
      setModal(null);
      await load();
    } catch (e) {
      console.error('[admin] salvar preço:', e);
      push(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: Price) {
    try {
      await getRepositories().admin.updatePrice(APP_CONFIG.company.id, p.id, { active: !p.active });
      await load();
      push(p.active ? 'Preço desativado.' : 'Preço ativado.');
    } catch (e) {
      console.error('[admin] toggle preço:', e);
      push(e instanceof Error ? e.message : 'Não foi possível alterar.');
    }
  }

  const nameOf = (list: Array<{ id: string; name: string }>, id: string | null) =>
    id ? (list.find((x) => x.id === id)?.name ?? id.slice(0, 8)) : '—';

  if (loading) return <LoadingState message="Carregando preços…" />;
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gelo">Preços</h1>
          <p className="text-sm text-cinza">Combinação modelo + serviço + categoria. Valores em R$.</p>
        </div>
        <Button size="md" onClick={() => openModal(null)}>Novo</Button>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl bg-musgo">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-cinza">
            <tr>
              <th className="p-3">Modelo</th><th className="p-3">Serviço</th>
              <th className="p-3">Categoria</th><th className="p-3 text-right">Preço</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody className="text-nevoa">
            {prices.map((p) => (
              <tr key={p.id} className="border-t border-linha">
                <td className="p-3">{nameOf(models, p.model_id)}</td>
                <td className="p-3">{nameOf(services, p.service_id)}</td>
                <td className="p-3">{p.service_option_id ? nameOf(allOptions, p.service_option_id) : '—'}</td>
                <td className="p-3 text-right font-bold text-gelo">
                  {formatBRL(Number(p.price))} {!p.active && <span className="ml-1 rounded-full bg-noite px-2 py-0.5 text-xs font-normal text-cinza">inativo</span>}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => openModal(p)} className="rounded-lg border border-linha px-2 py-1 text-xs font-semibold text-gelo hover:border-cinza">Editar</button>
                    <button onClick={() => void toggle(p)} className="rounded-lg border border-linha px-2 py-1 text-xs font-semibold text-gelo hover:border-cinza">
                      {p.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {prices.length === 0 && <p className="p-6 text-center text-sm text-cinza">Nenhum preço cadastrado.</p>}
      </div>
      {modal && (
        <Modal title={modal.price ? 'Editar preço' : 'Novo preço'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-3">
            <Select label="Modelo" name="price-model" value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!!modal.price}>
              <option value="">Selecione…</option>
              {models.filter((m) => m.active).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
            <Select label="Serviço" name="price-service" value={serviceId} onChange={(e) => onServiceChange(e.target.value)} disabled={!!modal.price}>
              <option value="">Selecione…</option>
              {services.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            {options.length > 0 && (
              <Select label="Categoria" name="price-option" value={optionId} onChange={(e) => setOptionId(e.target.value)} disabled={!!modal.price}>
                <option value="">Selecione…</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            )}
            <Input label="Preço (R$)" name="price-value" value={value} inputMode="decimal"
              onChange={(e) => setValue(e.target.value)} placeholder="599,90" />
            <Button fullWidth disabled={saving} onClick={() => void save()}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
