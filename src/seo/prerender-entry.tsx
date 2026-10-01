import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { PublicLayout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/public/HomePage';
import { ConsertoIphonePage } from '@/pages/seo/ConsertoIphonePage';
import { TrocaBateriaIphonePage } from '@/pages/seo/TrocaBateriaIphonePage';
import { TrocaTelaIphonePage } from '@/pages/seo/TrocaTelaIphonePage';
import { TrocaVidroIphonePage } from '@/pages/seo/TrocaVidroIphonePage';
import { VidroTraseiroIphonePage } from '@/pages/seo/VidroTraseiroIphonePage';
import { SEO_ROUTES, type SeoRouteMeta } from '@/seo/routes';
import { bateriaSchemas, consertoSchemas, homeSchemas, trocaTelaSchemas, vidroSchemas, vidroTraseiroSchemas } from '@/seo/schemas';

/**
 * Entry do prerender (Node, sem DOM, sem rede, sem Supabase).
 * Renderiza SOMENTE conteúdo estático: efeitos (useEffect) não executam no
 * renderToStaticMarkup, então seletores/preços hidratam no cliente.
 * Páginas devem manter a fase de render livre de window/document/fetch.
 */

export interface PrerenderTarget {
  routeId: 'home' | 'conserto' | 'trocaTela' | 'trocaBateria' | 'trocaVidro' | 'vidroTraseiro';
  meta: SeoRouteMeta;
  outFile: string;
}

export const PRERENDER_TARGETS: PrerenderTarget[] = [
  { routeId: 'home', meta: SEO_ROUTES.home, outFile: 'index.html' },
  { routeId: 'conserto', meta: SEO_ROUTES.conserto, outFile: 'conserto-iphone/index.html' },
  { routeId: 'trocaTela', meta: SEO_ROUTES.trocaTela, outFile: 'troca-tela-iphone/index.html' },
  { routeId: 'trocaBateria', meta: SEO_ROUTES.trocaBateria, outFile: 'troca-bateria-iphone/index.html' },
  { routeId: 'trocaVidro', meta: SEO_ROUTES.trocaVidro, outFile: 'troca-vidro-iphone/index.html' },
  { routeId: 'vidroTraseiro', meta: SEO_ROUTES.vidroTraseiro, outFile: 'vidro-traseiro-iphone/index.html' },
];

const PAGE_BY_ROUTE = {
  home: HomePage,
  conserto: ConsertoIphonePage,
  trocaTela: TrocaTelaIphonePage,
  trocaBateria: TrocaBateriaIphonePage,
  trocaVidro: TrocaVidroIphonePage,
  vidroTraseiro: VidroTraseiroIphonePage,
} as const;

export function renderTargetBody(routeId: PrerenderTarget['routeId']): string {
  const Page = PAGE_BY_ROUTE[routeId];
  // Mesma composição do App (providers inclusos): o primeiro render do
  // cliente precisa ser estruturalmente idêntico para hidratar sem mismatch.
  // ToastProvider renderiza um container vazio determinístico; AuthProvider
  // só toca browser/rede em useEffect (não executa no SSR).
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <ToastProvider>
          <PublicLayout wide>
            <Page />
          </PublicLayout>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

export function targetSchemas(routeId: PrerenderTarget['routeId'], siteUrl?: string): Array<Record<string, unknown>> {
  const meta = SEO_ROUTES[routeId];
  if (routeId === 'home') return homeSchemas(meta, siteUrl);
  if (routeId === 'conserto') return consertoSchemas(meta, siteUrl);
  if (routeId === 'trocaTela') return trocaTelaSchemas(meta, siteUrl);
  if (routeId === 'trocaBateria') return bateriaSchemas(meta, siteUrl);
  if (routeId === 'trocaVidro') return vidroSchemas(meta, siteUrl);
  return vidroTraseiroSchemas(meta, siteUrl);
}
