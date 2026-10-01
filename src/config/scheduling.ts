/**
 * Janelas de atendimento delivery — FONTE ÚNICA da regra de negócio.
 * SEG–SÁB 09:00–19:00 · domingo fechado · capacidade 1 por janela.
 * O banco espelha a trava (índice único parcial); este arquivo define o catálogo de janelas.
 */

export interface ServiceWindow {
  start: string; // 'HH:MM'
  end: string; // 'HH:MM'
}

export const SCHEDULING_CONFIG = {
  timeZone: 'America/Sao_Paulo',
  /** Dias com atendimento (0 = domingo). Domingo sem atendimento. */
  workingWeekdays: [1, 2, 3, 4, 5, 6],
  windows: [
    { start: '09:00', end: '11:00' },
    { start: '11:00', end: '13:00' },
    { start: '13:00', end: '15:00' },
    { start: '15:00', end: '17:00' },
    { start: '17:00', end: '19:00' },
  ] as ServiceWindow[],
  /** Dias à frente exibidos no seletor. */
  daysAhead: 14,
} as const;
