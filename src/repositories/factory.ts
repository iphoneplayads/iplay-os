import type { BookingRepository, CatalogRepository } from './mock.repository';
import { mockBookingRepository, mockCatalogRepository } from './mock.repository';
import type { AdminRepository } from './admin.repository';
import { mockAdminRepository } from './admin.repository';
import { supabaseAdminRepository } from './admin.repository';
import { supabaseBookingRepository } from './supabase/booking.repository';
import { supabaseCatalogRepository } from './supabase/catalog.repository';
import { getActiveBackend } from '@/lib/supabase/client';

/**
 * Factory de repositories — o ÚNICO ponto de troca de backend.
 *
 * - Padrão local: mocks isolados (`VITE_USE_MOCK` diferente de 'false').
 * - `VITE_USE_MOCK=false`: Supabase real. Sem credenciais, os repositories
 *   lançam "Supabase credentials not configured." (nada opera em mock calado).
 */
export interface Repositories {
  catalog: CatalogRepository;
  booking: BookingRepository;
  admin: AdminRepository;
}

export function getRepositories(): Repositories {
  if (getActiveBackend() === 'supabase') {
    return {
      catalog: supabaseCatalogRepository,
      booking: supabaseBookingRepository,
      admin: supabaseAdminRepository,
    };
  }
  return { catalog: mockCatalogRepository, booking: mockBookingRepository, admin: mockAdminRepository };
}
