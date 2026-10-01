import { APP_CONFIG } from '@/config/app';
import { SCHEDULING_CONFIG } from '@/config/scheduling';
import { saoPauloNow, timeToMinutes, windowLabel, type NowParts } from '@/lib/scheduling';
import { getRepositories } from '@/repositories/factory';

export type WindowState = 'free' | 'taken' | 'past' | 'closed';

export interface DayWindow {
  start: string;
  end: string;
  label: string;
  state: WindowState;
}

/**
 * Janelas de um dia com disponibilidade REAL do banco.
 * Domingo → todas 'closed'. Hoje → janelas já iniciadas somem (não são oferecidas).
 * Ocupadas → 'taken' (exibidas desabilitadas, sem nenhum dado de terceiros).
 */
export async function getDayWindows(dateISO: string, nowOverride?: NowParts): Promise<DayWindow[]> {
  const picked = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(picked.getTime())) return [];
  if (picked.getDay() === 0) {
    return SCHEDULING_CONFIG.windows.map((w) => ({
      ...w,
      label: windowLabel(w.start, w.end),
      state: 'closed' as const,
    }));
  }
  const occupied = new Set(
    (await getRepositories().booking.getOccupiedSlots(APP_CONFIG.company.id, dateISO)).map(
      (s) => s.start_time.slice(0, 5),
    ),
  );
  const now = nowOverride ?? saoPauloNow();
  const isToday = dateISO === now.dateISO;
  return SCHEDULING_CONFIG.windows
    .filter((w) => !isToday || timeToMinutes(w.start) > now.minutes)
    .map((w) => ({
      ...w,
      label: windowLabel(w.start, w.end),
      state: (occupied.has(w.start) ? 'taken' : 'free') as WindowState,
    }));
}
