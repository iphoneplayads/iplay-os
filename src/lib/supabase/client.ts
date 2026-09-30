import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase — FASE 2/3.
 *
 * Usa SOMENTE a anon key (nunca service_role no frontend).
 * Retorna null quando não configurado → os repositories lançam
 * missingCredentialsError() (mensagem explícita, sem fallback silencioso).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cached) {
    cached = createClient(url as string, anonKey as string, {
      // Sessão persistida: necessária para o login administrativo (/admin).
      // Anon continua sem sessão; nada muda no fluxo público.
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cached;
}

/** Operador pediu explicitamente o banco real (VITE_USE_MOCK=false). */
export function wantsSupabase(): boolean {
  return import.meta.env.VITE_USE_MOCK === 'false';
}

/**
 * Backend ativo.
 * - VITE_USE_MOCK=false → 'supabase' SEMPRE; sem credenciais, as chamadas falham
 *   com mensagem explícita (nunca cai em silêncio no mock).
 * - Qualquer outro valor (padrão local) → 'mock'.
 */
export function getActiveBackend(): 'supabase' | 'mock' {
  return wantsSupabase() ? 'supabase' : 'mock';
}

/** Erro padrão do modo real sem credenciais (ETAPA 10/13). */
export function missingCredentialsError(): Error {
  return new Error(
    'Supabase credentials not configured. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
  );
}
