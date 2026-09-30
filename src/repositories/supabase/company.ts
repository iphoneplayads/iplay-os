import { APP_CONFIG } from '@/config/app';
import { getSupabaseClient, missingCredentialsError } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Cliente autenticado/anon conforme sessão (nunca service_role). */
export function supa(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) throw missingCredentialsError();
  return client;
}

/** UUID real do tenant a partir do slug (o frontend nunca guarda UUID). */
export async function resolveCompanyId(): Promise<string> {
  const { data, error } = await supa()
    .from('companies')
    .select('id')
    .eq('slug', APP_CONFIG.company.slug)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Empresa inválida.');
  return (data as { id: string }).id;
}

/** Erros do PostgREST → mensagens seguras (sem vazar detalhe técnico). */
export function toFriendlyError(error: { code?: string; message: string }, fallback: string): Error {
  if (error.code === '23505') return new Error('Já existe um registro com esses dados.');
  if (error.code === 'PGRST116') return new Error('Registro não encontrado.');
  console.error('[supabase] erro técnico:', error.message);
  return new Error(fallback);
}
