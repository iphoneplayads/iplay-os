import { SCHEDULING_CONFIG } from '@/config/scheduling';

const WEEKDAYS_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export interface NowParts {
  dateISO: string; // YYYY-MM-DD em America/Sao_Paulo
  minutes: number; // minutos desde 00:00 em America/Sao_Paulo
}

/** "Agora" no fuso da operação (sem depender do fuso do aparelho do cliente). */
export function saoPauloNow(at: Date = new Date()): NowParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SCHEDULING_CONFIG.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  const dateISO = `${get('year')}-${get('month')}-${get('day')}`;
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  return { dateISO, minutes };
}

export interface CalendarDay {
  dateISO: string;
  weekday: number; // 0 = domingo
  weekdayLabel: string;
  dayNumber: string;
  monthLabel: string;
  isToday: boolean;
  isTomorrow: boolean;
  closed: boolean; // domingo
}

/** Próximos N dias (calendário), marcando domingos como fechados. */
export function nextCalendarDays(count: number = SCHEDULING_CONFIG.daysAhead, at: Date = new Date()): CalendarDay[] {
  const now = saoPauloNow(at);
  const [y, m, d] = now.dateISO.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d, 12);
  const days: CalendarDay[] = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(base + i * 86_400_000);
    const dateISO = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
    // weekday da DATA (independe de fuso): meio-dia UTC do próprio dia.
    const weekday = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 12)).getUTCDay();
    days.push({
      dateISO,
      weekday,
      weekdayLabel: WEEKDAYS_SHORT[weekday] ?? '',
      dayNumber: String(t.getUTCDate()).padStart(2, '0'),
      monthLabel: MONTHS_SHORT[t.getUTCMonth()] ?? '',
      isToday: i === 0,
      isTomorrow: i === 1,
      closed: !(SCHEDULING_CONFIG.workingWeekdays as readonly number[]).includes(weekday),
    });
  }
  return days;
}

/** 'HH:MM' → minutos. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** 'HH:MM' + minutos → 'HH:MM' (para fallback de fim de janela). */
export function addMinutesToTime(t: string, minutes: number): string {
  const total = (timeToMinutes(t) + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** '09:00'+'11:00' → '09h às 11h' (linguagem amigável, sem formato técnico). */
export function windowLabel(start: string, end: string): string {
  const short = (t: string): string => t.slice(0, 2) + 'h';
  return `${short(start)} às ${short(end)}`;
}

/** Fim da janela para um início (da config; fallback +2h). */
export function endTimeForWindow(start: string): string {
  const found = SCHEDULING_CONFIG.windows.find((w) => w.start === start);
  if (found) return found.end;
  return addMinutesToTime(start, 120);
}
