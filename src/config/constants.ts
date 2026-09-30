/** slugs estáveis dos serviços (contrato entre mock/banco e UI). */
export const SERVICE_SLUGS = {
  screen: 'troca-de-tela',
  battery: 'troca-de-bateria',
  backGlass: 'troca-de-vidro-traseiro',
  frontGlass: 'troca-de-vidro-da-tela',
  other: 'outro-problema',
} as const;

/** Rótulos do passo 2 do fluxo (problema → serviço). */
export const PROBLEM_OPTIONS = [
  { label: 'Tela quebrada ou com problema', serviceSlug: SERVICE_SLUGS.screen },
  { label: 'Bateria', serviceSlug: SERVICE_SLUGS.battery },
  { label: 'Vidro traseiro quebrado', serviceSlug: SERVICE_SLUGS.backGlass },
  { label: 'Vidro da tela', serviceSlug: SERVICE_SLUGS.frontGlass },
  { label: 'Outro problema', serviceSlug: SERVICE_SLUGS.other },
] as const;
