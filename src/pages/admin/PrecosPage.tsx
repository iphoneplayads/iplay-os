import { useEffect, useState } from 'react';
import { APP_CONFIG } from '@/config/app';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { formatBRL, parseBRLInput } from '@/lib/utils/format';
import { cardFromPix, cardPriceState, displayInstallment, effectiveCard, effectivePix } from '@/lib/pricing';
import { MAX_CARD_INSTALLMENTS } from '@/config/pricing';
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
  const [cardValue, setCardValue] = useState('');
  const [cardManual, setCardManual] = useState(false);
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
    const pix = price ? String(effectivePix(price)) : '';
    setValue(pix);
    if (price && price.card_price != null) {
      setCardValue(String(price.card_price));
      setCardManual(price.card_price_custom);
    } else {
      // Linha legada (sem cartão) ou preço novo: campo vazio até definição
      // consciente. Nada é presumido nem gravado até salvar.
      setCardValue('');
      setCardManual(false);
    }
    setOptions(sId ? allOptions.filter((o) => o.service_id === sId) : []);
  }

  function onServiceChange(sId: string) {
    setServiceId(sId);
    setOptionId('');
    setOptions(sId ? allOptions.filter((o) => o.service_id === sId) : []);
  }

  function handlePixChange(raw: string) {
    setValue(raw);
    if (!cardManual) {
      const pix = parseBRLInput(raw);
      setCardValue(pix == null ? '' : String(cardFromPix(pix)));
    }
  }

  function handleCardChange(raw: string) {
    setCardValue(raw);
    setCardManual(true);
  }

  function useAutoCard() {
    const pix = parseBRLInput(value);
    if (pix == null) {
      push('Informe primeiro um Pix válido.');
      return;
    }
    setCardValue(String(cardFromPix(pix)));
    setCardManual(false);
  }

  const cardPreview = parseBRLInput(cardValue);
  const editingLegacy = modal?.price != null && cardPriceState(modal.price) === 'legacy';

  async function save() {
    const pix = parseBRLInput(value);
    if (!modelId || !serviceId) {
      push('Selecione modelo e serviço.');
      return;
    }
    if (pix == null) {
      push('Informe um Pix válido maior que zero (ex.: 599,90).');
      return;
    }
    let card: number | undefined;
    if (cardManual) {
      const parsedCard = parseBRLInput(cardValue);
      if (parsedCard == null) {
        push('Informe um cartão válido maior que zero ou use o cálculo automático.');
        return;
      }
      card = parsedCard;
    }
    setSaving(true);
    try {
      const admin = getRepositories().admin;
      if (modal?.price) {
        await admin.updatePrice(APP_CONFIG.company.id, modal.price.id, {
          pixValue: pix, cardPrice: card, cardAuto: !cardManual,
        });
        push('Preço atualizado.');
      } else {
        await admin.createPrice(APP_CONFIG.company.id, {
          modelId, serviceId, serviceOptionId: optionId || null,
          value: pix, pixValue: pix, cardPrice: card, cardAuto: !cardManual,
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
                  <span className="block">{formatBRL(effectivePix(p))} <span className="font-normal text-cinza">no Pix</span></span>
                  <span className="block text-xs font-semibold text-cinza">{formatBRL(effectiveCard(p))} no cartão</span>
                  {!p.active && <span className="ml-1 rounded-full bg-noite px-2 py-0.5 text-xs font-normal text-cinza">inativo</span>}
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
            <Input label="Preço no Pix (R$)" name="price-pix" value={value} inputMode="decimal"
              onChange={(e) => handlePixChange(e.target.value)} placeholder="599,90" />
            <div>
              {editingLegacy && (
                <p className="mb-2 rounded-xl border border-linha bg-noite px-3 py-2 text-xs text-cinza">
                  Preço anterior — defina o cartão ao salvar. Nada foi presumido sobre esta linha.
                </p>
              )}
              <Input label="Preço no cartão (R$)" name="price-card" value={cardValue} inputMode="decimal"
                onChange={(e) => handleCardChange(e.target.value)} placeholder="655,90" />
              <p className="mt-1 text-xs text-cinza">
                {cardManual
                  ? 'Valor personalizado'
                  : cardValue !== ''
                    ? '+11% calculado automaticamente'
                    : 'Preencha o Pix ou digite o cartão'}
              </p>
              {cardManual && (
                <button
                  type="button"
                  onClick={useAutoCard}
                  className="mt-1 text-xs font-bold text-lima underline underline-offset-2"
                >
                  Usar cálculo automático (+11%)
                </button>
              )}
              {cardPreview != null && (
                <p className="mt-1 text-xs text-cinza">
                  Até {MAX_CARD_INSTALLMENTS}x sem juros · {MAX_CARD_INSTALLMENTS}x de {formatBRL(displayInstallment(cardPreview))}
                </p>
              )}
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
