// Testes estáticos da fundação SEO (sem rede, sem DOM).
// Execução: bundle via esbuild (resolve @/) + node --test (ver relatório Fase 1).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SEO_CONFIG } from './config';
import { SEO_ROUTES, SEO_SITEMAP_PATHS } from './routes';
import { breadcrumbSchema, organizationSchema, serviceSchema, webPageSchema } from './schemas';
import { buildRobotsTxt, buildSitemapXml, sitemapUrl } from './sitemap';

const srcFile = (rel: string): string => readFileSync(join(process.cwd(), 'src', rel), 'utf8');

describe('SEO fundação', () => {
  it('marca pública é iPlay, sem "iPlay OS" nos metadados', () => {
    assert.equal(SEO_CONFIG.brand, 'iPlay');
    for (const route of Object.values(SEO_ROUTES)) {
      assert.ok(!route.title.includes('iPlay OS'), route.id);
      assert.ok(!route.description.includes('iPlay OS'), route.id);
    }
  });

  it('slogan oficial, sem endereço físico em lugar nenhum', () => {
    assert.equal(SEO_CONFIG.slogan, 'Seu iPhone em boas mãos.');
    const schema = JSON.stringify(organizationSchema());
    assert.ok(!/endereço|address|geo|latitude|longitude|como chegar/i.test(schema));
  });

  it('Organization só com o que é verdade', () => {
    const schema = organizationSchema() as Record<string, unknown>;
    assert.equal(schema['@type'], 'Organization');
    assert.ok(!('aggregateRating' in schema));
    assert.ok(!('address' in schema));
    assert.ok(!('geo' in schema));
  });

  it('/agendar é noindex,follow com canonical sem query', () => {
    assert.equal(SEO_ROUTES.agendar.robots, 'noindex,follow');
    assert.equal(SEO_ROUTES.agendar.canonicalPath, '/agendar');
  });

  it('admin e 404 são noindex', () => {
    assert.match(SEO_ROUTES.admin.robots, /noindex/);
    assert.match(SEO_ROUTES.notFound.robots, /noindex/);
  });

  it('sitemap só com URLs existentes (sem admin/agendar/futuras)', () => {
    assert.deepEqual(SEO_SITEMAP_PATHS, [
      '/',
      '/conserto-iphone/',
      '/troca-tela-iphone/',
      '/troca-bateria-iphone/',
      '/troca-vidro-iphone/',
      '/vidro-traseiro-iphone/',
    ]);
    const xml = buildSitemapXml('https://www.iplay.example') ?? '';
    assert.ok(!xml.includes('/admin') && !xml.includes('/agendar'));
  });

  it('sem site URL: sem sitemap, sem canonical (falha segura)', () => {
    assert.equal(buildSitemapXml(undefined), null);
    assert.equal(sitemapUrl(undefined), null);
    assert.equal(sitemapUrl('http://localhost:5173'), null);
  });

  it('robots permite tudo (nunca bloqueia CSS/JS)', () => {
    assert.equal(buildRobotsTxt(), 'User-agent: *\nAllow: /\n');
  });
});

describe('SEO landings 2A/2B', () => {
  const conserto = srcFile('pages/seo/ConsertoIphonePage.tsx');
  const tela = srcFile('pages/seo/TrocaTelaIphonePage.tsx');
  const bateria = srcFile('pages/seo/TrocaBateriaIphonePage.tsx');
  const vidro = srcFile('pages/seo/TrocaVidroIphonePage.tsx');
  const traseiro = srcFile('pages/seo/VidroTraseiroIphonePage.tsx');
  const explorer = srcFile('pages/seo/ServicePriceExplorer.tsx');
  const app = srcFile('App.tsx');

  it('metas das rotas (title/canonical/robots)', () => {
    assert.equal(SEO_ROUTES.conserto.title, 'Conserto de iPhone no Rio de Janeiro | iPlay');
    assert.equal(SEO_ROUTES.conserto.canonicalPath, '/conserto-iphone/');
    assert.equal(SEO_ROUTES.conserto.robots, 'index,follow');
    assert.equal(SEO_ROUTES.trocaTela.title, 'Troca de Tela de iPhone no Rio de Janeiro | iPlay');
    assert.equal(SEO_ROUTES.trocaTela.canonicalPath, '/troca-tela-iphone/');
    assert.equal(SEO_ROUTES.trocaTela.robots, 'index,follow');
    assert.equal(SEO_ROUTES.trocaBateria.title, 'Troca de Bateria de iPhone no Rio de Janeiro | iPlay');
    assert.equal(SEO_ROUTES.trocaBateria.canonicalPath, '/troca-bateria-iphone/');
    assert.equal(SEO_ROUTES.trocaBateria.robots, 'index,follow');
    assert.equal(SEO_ROUTES.trocaVidro.title, 'Troca de Vidro de iPhone no Rio de Janeiro | iPlay');
    assert.equal(SEO_ROUTES.trocaVidro.canonicalPath, '/troca-vidro-iphone/');
    assert.equal(SEO_ROUTES.trocaVidro.robots, 'index,follow');
    assert.equal(SEO_ROUTES.vidroTraseiro.title, 'Troca de Vidro Traseiro de iPhone no Rio de Janeiro | iPlay');
    assert.equal(SEO_ROUTES.vidroTraseiro.canonicalPath, '/vidro-traseiro-iphone/');
    assert.equal(SEO_ROUTES.vidroTraseiro.robots, 'index,follow');
  });

  it('sitemap contém as 6 URLs e nada futuro', () => {
    assert.deepEqual(SEO_SITEMAP_PATHS, [
      '/',
      '/conserto-iphone/',
      '/troca-tela-iphone/',
      '/troca-bateria-iphone/',
      '/troca-vidro-iphone/',
      '/vidro-traseiro-iphone/',
    ]);
    const xml = buildSitemapXml('https://www.iplay.example') ?? '';
    assert.ok(!xml.includes('/admin') && !xml.includes('/agendar') && !xml.includes('blog'));
    assert.ok(!/por-modelo|copacabana|ipanema|barra/.test(xml));
  });

  it('sem páginas futuras, sem bairro, sem blog nas rotas', () => {
    for (const bad of ['/blog', 'copacabana', 'ipanema', 'barra-da-tijuca', 'por-modelo']) {
      assert.ok(!app.includes(bad), bad);
      assert.ok(!SEO_SITEMAP_PATHS.some((p) => p.includes(bad)), bad);
    }
  });

  it('sem preço hardcoded e sem R$ 0 nas landings', () => {
    const pages = { conserto, tela, bateria, vidro, traseiro, explorer } as const;
    for (const [name, src] of Object.entries(pages)) {
      assert.ok(!/R\$\s*\d/.test(src), `${name}: preço literal`);
      assert.ok(!/0,00/.test(src), `${name}: R$ 0`);
    }
    assert.ok(explorer.includes('getPrice('), 'preço via arquitetura existente');
  });

  it('links internos reais entre as landings', () => {
    assert.ok(conserto.includes('/troca-tela-iphone/'), 'conserto → tela');
    assert.ok(conserto.includes('/troca-bateria-iphone/'), 'conserto → bateria');
    assert.ok(conserto.includes('/troca-vidro-iphone/'), 'conserto → vidro');
    assert.ok(conserto.includes('/vidro-traseiro-iphone/'), 'conserto → traseiro');
    assert.ok(tela.includes('/conserto-iphone/'), 'tela → conserto');
    assert.ok(tela.includes('/agendar?servico=troca-de-tela'), 'cta tela → agendar');
    assert.ok(vidro.includes('/troca-tela-iphone/'), 'vidro ↔ tela');
    assert.ok(tela.includes('troca de vidro') || tela.includes('vidro da tela'), 'tela menciona vidro');
    assert.ok(bateria.includes(`/agendar?servico=`), 'bateria → agendar');
  });

  it('schemas conservadores (sem address/aggregateRating/fake review)', () => {
    for (const schema of [
      webPageSchema({ name: 't', description: 'd' }),
      serviceSchema({ name: 's', description: 'd' }),
      breadcrumbSchema([{ name: 'Início', url: 'https://x/' }, { name: 'Atual' }]),
    ]) {
      const blob = JSON.stringify(schema);
      assert.ok(!/address|aggregateRating|review|geo|Offer/i.test(blob));
    }
    const crumbs = breadcrumbSchema([{ name: 'Início' }, { name: 'Meio' }, { name: 'Fim' }]) as {
      itemListElement: Array<{ position: number }>;
    };
    assert.deepEqual(crumbs.itemListElement.map((c) => c.position), [1, 2, 3]);
  });

  it('FAQ sem JSON-LD e sem afirmações não confirmadas', () => {
    const all = tela + conserto + bateria + vidro + traseiro;
    assert.ok(!/FAQPage/i.test(all));
    assert.ok(!/perder.*dados|backup/i.test(all), 'dados: não publicado');
  });
});

describe('SEO hidratação 2C', () => {
  const main = srcFile('main.tsx');
  const entry = srcFile('seo/prerender-entry.tsx');
  const script = readFileSync(join(process.cwd(), 'scripts', 'prerender.mjs'), 'utf8');

  it('páginas prerenderizadas usam hydrateRoot; shell usa createRoot', () => {
    assert.ok(main.includes('hydrateRoot'), 'usa hydrateRoot');
    assert.ok(main.includes('data-prerendered-path'), 'lê o marcador');
    assert.ok(main.includes('firstElementChild'), 'exige markup presente');
    assert.ok(main.includes('createRoot'), 'fallback CSR mantido');
  });

  it('detecção por marcador explícito, sem heurística frágil', () => {
    assert.ok(script.includes('data-prerendered-path'), 'prerender emite o marcador');
    assert.ok(!/innerHTML\.length/.test(main), 'sem heurística de tamanho');
  });

  it('entry espelha a composição do App (providers inclusos)', () => {
    assert.ok(entry.includes('AuthProvider'), 'mesmo provider de auth');
    assert.ok(entry.includes('ToastProvider'), 'mesmo provider de toast (container vazio)');
    assert.ok(entry.includes('MemoryRouter'), 'router sem DOM');
    assert.ok(entry.includes('PublicLayout'), 'mesmo layout');
  });

  it('sem máscaras de mismatch nem hacks', () => {
    for (const [name, src] of [['main', main], ['entry', entry]] as const) {
      assert.ok(!src.includes('suppressHydrationWarning'), `${name}: sem suppress`);
      assert.ok(!/setTimeout/.test(src), `${name}: sem setTimeout`);
    }
    assert.ok(!/userAgent|Googlebot|bot\b/i.test(main + entry), 'sem sniffing de bot');
  });

  it('rotas prerenderizadas são as seis (sem modelo/bairro/blog)', () => {
    for (const id of ['home', 'conserto', 'trocaTela', 'trocaBateria', 'trocaVidro', 'vidroTraseiro']) {
      assert.ok(entry.includes(`'${id}'`), id);
    }
    assert.ok(!/bateria-nova|por-modelo|blog/.test(entry));
  });
});
