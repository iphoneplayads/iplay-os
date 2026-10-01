import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { SERVICE_SLUGS } from '@/config/constants';
import { SEO_CONFIG } from '@/seo/config';
import { SEO_ROUTES } from '@/seo/routes';
import { SeoHead } from '@/seo/SeoHead';
import { vidroSchemas } from '@/seo/schemas';
import { Breadcrumbs, Faq, SeoCta, SeoEyebrow, SeoH2, SeoLead, Steps } from './components/SeoBlocks';
import { ServicePriceExplorer } from './ServicePriceExplorer';

/**
 * Vidro frontal: aqui o CTA leva ao seletor de modelo da própria página
 * ("Consultar meu iPhone"), e o preço exibido usa o serviço real de vidro.
 */

const STEPS = [
  { n: '01', title: 'Confira os sinais', text: 'Vidro quebrado com imagem e touch normais? Pode ser só o vidro.' },
  { n: '02', title: 'Escolha o modelo', text: 'Selecione a família e o modelo do seu iPhone.' },
  { n: '03', title: 'Veja o preço', text: 'Valor da troca do vidro antes de qualquer compromisso.' },
  { n: '04', title: 'Agende a avaliação', text: 'Dia e janela de atendimento delivery.' },
  { n: '05', title: 'Pronto', text: 'Técnico confirma o escopo e executa o reparo.' },
];

const FAQ = [
  {
    q: 'Como sei se é só o vidro?',
    a: 'Quando o dano está concentrado no vidro externo e imagem, brilho e touch seguem funcionando normalmente, há boa chance de ser somente o vidro. A confirmação acontece na avaliação do técnico.',
  },
  {
    q: 'E se a imagem ou o touch estiverem com problema?',
    a: 'Aí o caso muda: falhas de imagem, linhas, manchas ou touch defeituoso costumam pedir a troca completa da tela, com opções e preços próprios.',
  },
  {
    q: 'A troca do vidro tem garantia?',
    a: 'Sim, com cobertura conforme o serviço contratado — o prazo aparece junto do preço antes da confirmação.',
  },
  {
    q: 'Vocês vão até minha casa?',
    a: 'Sim. O atendimento é delivery no Rio de Janeiro, dentro da janela agendada — em casa, no trabalho ou onde for mais conveniente.',
  },
  {
    q: 'Posso pagar parcelado?',
    a: 'Sim. Além do Pix, o cartão pode ser parcelado em até 10x sem juros, com o valor total exibido antes da confirmação.',
  },
];

export function TrocaVidroIphonePage() {
  const meta = SEO_ROUTES.trocaVidro;
  const schemas = useMemo(() => vidroSchemas(meta, SEO_CONFIG.siteUrl), [meta]);
  return (
    <>
      <SeoHead meta={meta} schemas={schemas} />
      <div className="mx-auto w-full max-w-5xl">
        <Breadcrumbs
          items={[
            { label: 'Início', href: '/' },
            { label: 'Conserto de iPhone', href: '/conserto-iphone/' },
            { label: 'Troca de vidro' },
          ]}
        />

        <section className="mt-6 rounded-3xl border border-linha bg-musgo p-8 sm:p-12">
          <SeoEyebrow>Troca de vidro de iPhone</SeoEyebrow>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-gelo sm:text-5xl">
            Troca de vidro de iPhone no Rio de Janeiro
          </h1>
          <p className="mt-4 max-w-xl text-lg text-nevoa">
            Quebrou o vidro, mas a imagem e o touch continuam funcionando normalmente? Em alguns casos é possível
            substituir somente o vidro, preservando o display.
          </p>
          <div className="mt-7">
            <a
              href="#modelos"
              className="inline-block rounded-2xl bg-lima px-6 py-3.5 text-center font-bold text-noite transition hover:brightness-110 active:scale-[0.99]"
            >
              Consultar meu iPhone
            </a>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Vidro ou tela</SeoEyebrow>
          <SeoH2>Trocar somente o vidro ou a tela completa?</SeoH2>
          <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-nevoa">
            <p>
              A troca somente do vidro pode ser uma possibilidade quando o dano está concentrado no vidro externo e
              display, imagem e touch permanecem funcionando adequadamente.
            </p>
            <p>
              Se houver falhas de imagem, linhas, manchas, ausência de imagem ou touch defeituoso, pode ser necessária
              avaliação para a{' '}
              <Link to="/troca-tela-iphone/" className="font-semibold text-lima hover:underline">
                troca completa da tela do iPhone
              </Link>
              , que tem opções e preços próprios por modelo.
            </p>
            <p>Nada aqui substitui a avaliação: o técnico confirma o escopo correto no atendimento.</p>
          </div>
        </section>

        <section id="modelos" className="mt-14 scroll-mt-24">
          <SeoEyebrow>Preço por modelo</SeoEyebrow>
          <SeoH2>Quanto custa trocar só o vidro?</SeoH2>
          <SeoLead>Valores reais do serviço de vidro, direto do nosso catálogo.</SeoLead>
          <div className="mt-6">
            <ServicePriceExplorer
              serviceSlug={SERVICE_SLUGS.frontGlass}
              compareHeading="Confira o valor e agende a avaliação"
              ctaLabel="Agendar avaliação/troca do vidro"
            />
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>O processo</SeoEyebrow>
          <SeoH2>Como funciona com a iPlay?</SeoH2>
          <Steps steps={STEPS} />
        </section>

        <section className="mt-14">
          <SeoEyebrow>Dúvidas</SeoEyebrow>
          <SeoH2>Perguntas frequentes</SeoH2>
          <Faq items={FAQ} />
          <div className="mt-8 text-center">
            <SeoCta to={`/agendar?servico=${SERVICE_SLUGS.frontGlass}`}>Agendar avaliação/troca do vidro</SeoCta>
          </div>
        </section>
      </div>
    </>
  );
}
