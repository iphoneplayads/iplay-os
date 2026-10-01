import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { SEO_CONFIG } from '@/seo/config';
import { SEO_ROUTES } from '@/seo/routes';
import { SeoHead } from '@/seo/SeoHead';
import { trocaTelaSchemas } from '@/seo/schemas';
import { Breadcrumbs, Faq, SeoCta, SeoEyebrow, SeoH2, SeoLead, Steps } from './components/SeoBlocks';
import { ScreenPriceExplorer } from './ScreenPriceExplorer';

const STEPS = [
  { n: '01', title: 'Escolha o modelo', text: 'Selecione a família e o modelo do seu iPhone.' },
  { n: '02', title: 'Compare as telas', text: 'Premium, Pro ou Original Remanufaturada, com preço e garantia.' },
  { n: '03', title: 'Veja o preço', text: 'Pix e cartão em até 10x antes de qualquer compromisso.' },
  { n: '04', title: 'Agende', text: 'Dia e janela de atendimento delivery.' },
  { n: '05', title: 'Pronto', text: 'Técnico no local e tela nova com garantia.' },
];

const FAQ = [
  {
    q: 'Quanto tempo demora a troca de tela?',
    a: 'O atendimento é realizado dentro da janela que você escolher no agendamento, com janelas de duas horas entre 9h e 19h, de segunda a sábado.',
  },
  {
    q: 'A troca de tela tem garantia?',
    a: 'Sim. Cada opção informa a própria cobertura antes da confirmação: a tela Premium tem 3 meses e as telas Pro e Original Remanufaturada têm 1 ano.',
  },
  {
    q: 'Qual a diferença entre Premium, Pro e Original Remanufaturada?',
    a: 'A Premium é a opção mais econômica; a Pro é a mais escolhida, com qualidade muito próxima da original; a Original Remanufaturada preserva o painel original e oferece máxima qualidade. Todas mostram preço e garantia antes do agendamento.',
  },
  {
    q: 'Vocês vão até minha casa?',
    a: 'Sim. A troca de tela pode ser feita em domicílio ou no local onde você estiver, no Rio de Janeiro, dentro da janela agendada.',
  },
  {
    q: 'Posso pagar parcelado?',
    a: 'Sim. Além do Pix, o cartão pode ser parcelado em até 10x sem juros, com o valor total exibido antes da confirmação.',
  },
];

export function TrocaTelaIphonePage() {
  const meta = SEO_ROUTES.trocaTela;
  const schemas = useMemo(() => trocaTelaSchemas(meta, SEO_CONFIG.siteUrl), [meta]);
  return (
    <>
      <SeoHead meta={meta} schemas={schemas} />
      <div className="mx-auto w-full max-w-5xl">
        <Breadcrumbs
          items={[
            { label: 'Início', href: '/' },
            { label: 'Conserto de iPhone', href: '/conserto-iphone/' },
            { label: 'Troca de tela' },
          ]}
        />

        <section className="mt-6 rounded-3xl border border-linha bg-musgo p-8 sm:p-12">
          <SeoEyebrow>Troca de tela de iPhone</SeoEyebrow>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-gelo sm:text-5xl">
            Troca de tela de iPhone no Rio de Janeiro
          </h1>
          <p className="mt-4 max-w-xl text-lg text-nevoa">
            Tela quebrada, sem imagem, com manchas ou touch falhando? Escolha seu modelo, compare as opções de tela e
            veja o preço antes de agendar.
          </p>
          <div className="mt-7">
            <a
              href="#modelos"
              className="inline-block rounded-2xl bg-lima px-6 py-3.5 text-center font-bold text-noite transition hover:brightness-110 active:scale-[0.99]"
            >
              Ver preço para meu iPhone
            </a>
          </div>
        </section>

        <section id="modelos" className="mt-14 scroll-mt-24">
          <SeoEyebrow>Preço por modelo</SeoEyebrow>
          <SeoH2>Quanto custa trocar a tela do seu iPhone?</SeoH2>
          <SeoLead>Valores reais, direto do nosso catálogo — iguais aos do agendamento.</SeoLead>
          <div className="mt-6">
            <ScreenPriceExplorer />
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Diagnóstico</SeoEyebrow>
          <SeoH2>Quando é necessário trocar a tela do iPhone?</SeoH2>
          <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-nevoa">
            <p>
              A troca completa costuma ser o caminho quando o dano passa do vidro externo: display e touch trabalham
              juntos, então trincas profundas, áreas sem imagem, linhas ou manchas na tela, toques falhando e perdas de
              brilho indicam que o conjunto precisa ser substituído.
            </p>
            <p>
              Se o aparelho sofreu queda, vale conferir também se há outros sintomas — o diagnóstico do técnico no
              atendimento confirma o escopo antes do reparo.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Vidro ou tela</SeoEyebrow>
          <SeoH2>Tela completa ou somente o vidro?</SeoH2>
          <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-nevoa">
            <p>
              Quando somente o vidro externo está quebrado e imagem, touch e display seguem funcionando normalmente,
              pode existir a possibilidade de trocar apenas o vidro — a iPlay também realiza a troca de vidro da tela
              para os casos compatíveis.
            </p>
            <p>
              Na dúvida, o seletor acima mostra as opções de tela completa com preço fechado; o técnico confirma a
              melhor solução no atendimento.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Opções</SeoEyebrow>
          <SeoH2>Qual tela escolher?</SeoH2>
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-linha bg-musgo p-5">
              <p className="font-display text-lg font-extrabold text-gelo">Premium</p>
              <p className="mt-1 text-sm text-cinza">A opção mais econômica para o dia a dia, com 3 meses de garantia.</p>
            </div>
            <div className="rounded-3xl border border-lima/40 bg-musgo p-5">
              <p className="font-display text-lg font-extrabold text-gelo">
                Pro <span className="ml-1 rounded-full bg-lima px-2 py-0.5 align-middle text-[11px] font-bold text-noite">MAIS ESCOLHIDA</span>
              </p>
              <p className="mt-1 text-sm text-cinza">Qualidade muito próxima da original, com 1 ano de garantia.</p>
            </div>
            <div className="rounded-3xl border border-linha bg-musgo p-5">
              <p className="font-display text-lg font-extrabold text-gelo">Original Remanufaturada</p>
              <p className="mt-1 text-sm text-cinza">Painel original preservado e máxima qualidade, com 1 ano de garantia.</p>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>O processo</SeoEyebrow>
          <SeoH2>Como funciona a troca de tela com a iPlay?</SeoH2>
          <Steps steps={STEPS} />
        </section>

        <section className="mt-14">
          <SeoEyebrow>Delivery</SeoEyebrow>
          <SeoH2>Atendimento delivery no Rio de Janeiro</SeoH2>
          <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-nevoa">
            <p>
              A troca de tela é feita em domicílio ou no local onde você estiver, dentro da janela agendada — sem
              deslocamento e sem fila de balcão.
            </p>
            <p>
              Precisa de outro reparo além da tela? Veja a página de{' '}
              <Link to="/conserto-iphone/" className="font-semibold text-lima hover:underline">
                conserto de iPhone
              </Link>{' '}
              com todos os serviços.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Dúvidas</SeoEyebrow>
          <SeoH2>Perguntas frequentes</SeoH2>
          <Faq items={FAQ} />
          <div className="mt-8 text-center">
            <SeoCta to="/agendar?servico=troca-de-tela">Agendar troca da tela</SeoCta>
          </div>
        </section>
      </div>
    </>
  );
}
