import { Link } from 'react-router-dom';
import { SEO_ROUTES } from '@/seo/routes';
import { SeoHead } from '@/seo/SeoHead';

/**
 * Página 404 — identidade iPlay, com rotas de saída (Home, Agendamento).
 *
 * LIMITAÇÃO DOCUMENTADA: em SPA estático o servidor entrega esta página com
 * HTTP 200 (soft-404). O status 404 real só será possível com prerender/SSG
 * ou regra de hospedagem (estratégia de deploy, fase posterior). O `noindex`
 * acima evita que essas URLs entrem no índice enquanto isso.
 */
export function NotFoundPage() {
  return (
    <>
      <SeoHead meta={SEO_ROUTES.notFound} />
      <div className="rounded-3xl border border-linha bg-musgo p-8 text-center sm:p-12">
        <p className="font-display text-5xl font-extrabold text-lima">404</p>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-gelo">Página não encontrada</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-cinza">
          O endereço que você procurou não existe ou foi movido. Volte ao início ou agende o conserto do seu iPhone.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            to="/"
            className="rounded-2xl border border-linha bg-noite px-6 py-3 text-center font-semibold text-gelo"
          >
            Voltar ao início
          </Link>
          <Link
            to="/agendar"
            className="rounded-2xl bg-lima px-6 py-3 text-center font-bold text-noite"
          >
            Agendar conserto
          </Link>
        </div>
      </div>
    </>
  );
}
