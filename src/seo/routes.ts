/**
 * Metadados por rota (SEO MASTER — FASE 1).
 * Rotas futuras (/conserto-iphone/ etc.) entram aqui centralmente.
 * "iPlay OS" NÃO aparece na comunicação pública — a marca é "iPlay".
 */

export interface SeoRouteMeta {
  id: string;
  title: string;
  description: string;
  /** Path canônico (sem query). `null` = sem canonical nesta fase. */
  canonicalPath: string | null;
  robots: string;
  ogType: 'website' | 'article';
}

export const SEO_ROUTES = {
  home: {
    id: 'home',
    title: 'iPlay — Conserto de iPhone no Rio de Janeiro com atendimento delivery',
    description:
      'Conserto de iPhone no Rio de Janeiro com atendimento delivery: escolha o modelo, veja o preço antes de agendar e receba o técnico onde você estiver.',
    canonicalPath: '/',
    robots: 'index,follow',
    ogType: 'website',
  },
  agendar: {
    id: 'agendar',
    title: 'Agendar conserto de iPhone — iPlay',
    description:
      'Agende o conserto do seu iPhone com a iPlay: escolha o modelo, confira o valor e selecione dia e janela de atendimento delivery.',
    // /agendar?servico=* canonicaliza para /agendar (sem query).
    canonicalPath: '/agendar',
    // Conversão, não aquisição: futuras landings SEO assumem o orgânico.
    robots: 'noindex,follow',
    ogType: 'website',
  },
  admin: {
    id: 'admin',
    title: 'iPlay — Admin',
    description: 'Área administrativa da iPlay.',
    canonicalPath: null,
    robots: 'noindex,nofollow',
    ogType: 'website',
  },
  notFound: {
    id: 'notFound',
    title: 'Página não encontrada — iPlay',
    description: 'A página que você procurou não foi encontrada. Volte ao início ou agende o conserto do seu iPhone.',
    canonicalPath: null,
    robots: 'noindex,follow',
    ogType: 'website',
  },
  conserto: {
    id: 'conserto',
    title: 'Conserto de iPhone no Rio de Janeiro | iPlay',
    description:
      'Seu iPhone deu problema? Veja o preço antes de agendar. A iPlay oferece conserto de iPhone com atendimento delivery no Rio de Janeiro.',
    canonicalPath: '/conserto-iphone/',
    robots: 'index,follow',
    ogType: 'website',
  },
  trocaTela: {
    id: 'trocaTela',
    title: 'Troca de Tela de iPhone no Rio de Janeiro | iPlay',
    description:
      'Quebrou a tela do iPhone? Escolha seu modelo, compare as opções de tela, veja o preço e agende seu atendimento com a iPlay no Rio de Janeiro.',
    canonicalPath: '/troca-tela-iphone/',
    robots: 'index,follow',
    ogType: 'website',
  },
  trocaBateria: {
    id: 'trocaBateria',
    title: 'Troca de Bateria de iPhone no Rio de Janeiro | iPlay',
    description:
      'A bateria do iPhone está descarregando rápido? Escolha seu modelo, veja o preço da troca de bateria e agende seu atendimento com a iPlay no Rio de Janeiro.',
    canonicalPath: '/troca-bateria-iphone/',
    robots: 'index,follow',
    ogType: 'website',
  },
  trocaVidro: {
    id: 'trocaVidro',
    title: 'Troca de Vidro de iPhone no Rio de Janeiro | iPlay',
    description:
      'Quebrou o vidro do iPhone, mas imagem e touch continuam funcionando? Veja como funciona a troca somente do vidro, consulte o preço e agende com a iPlay.',
    canonicalPath: '/troca-vidro-iphone/',
    robots: 'index,follow',
    ogType: 'website',
  },
  vidroTraseiro: {
    id: 'vidroTraseiro',
    title: 'Troca de Vidro Traseiro de iPhone no Rio de Janeiro | iPlay',
    description:
      'Quebrou o vidro traseiro do iPhone? Escolha seu modelo, consulte o preço e veja a disponibilidade do atendimento com a iPlay no Rio de Janeiro.',
    canonicalPath: '/vidro-traseiro-iphone/',
    robots: 'index,follow',
    ogType: 'website',
  },
} satisfies Record<string, SeoRouteMeta>;

/** URLs públicas, canônicas e indexáveis que EXISTEM (sitemap desta fase). */
export const SEO_SITEMAP_PATHS: string[] = [
  '/',
  '/conserto-iphone/',
  '/troca-tela-iphone/',
  '/troca-bateria-iphone/',
  '/troca-vidro-iphone/',
  '/vidro-traseiro-iphone/',
];
