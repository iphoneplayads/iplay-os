/**
 * Consulta de CEP (ViaCEP) — conveniência de preenchimento, NÃO dependência crítica.
 * Envía ao ViaCEP SOMENTE o CEP (no path da URL). Nenhum outro dado do cliente
 * (nome, telefone, email, número, serviço, modelo, preço) sai deste serviço.
 */

export interface CepAddress {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export type CepLookupResult =
  | { ok: true; data: CepAddress }
  | { ok: false; reason: 'not-found' | 'unavailable' };

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: string | boolean;
}

/** Somente dígitos, no máximo 8. */
export function unmaskCep(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

/** Exibe como 00000-000. */
export function maskCep(value: string): string {
  const d = unmaskCep(value);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function isCompleteCep(value: string): boolean {
  return unmaskCep(value).length === 8;
}

export async function lookupCep(
  digits: string,
  signal?: AbortSignal,
): Promise<CepLookupResult> {
  const zip = unmaskCep(digits);
  if (zip.length !== 8) return { ok: false, reason: 'not-found' };
  let res: Response;
  try {
    res = await fetch(`https://viacep.com.br/ws/${zip}/json/`, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return { ok: false, reason: 'unavailable' };
  }
  if (!res.ok) return { ok: false, reason: 'unavailable' };
  let body: ViaCepResponse;
  try {
    body = (await res.json()) as ViaCepResponse;
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  if (body.erro === true || body.erro === 'true') return { ok: false, reason: 'not-found' };
  return {
    ok: true,
    data: {
      zipCode: zip,
      street: body.logradouro ?? '',
      neighborhood: body.bairro ?? '',
      city: body.localidade ?? '',
      state: body.uf ?? '',
    },
  };
}
