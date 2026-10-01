import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { SERVICE_SLUGS } from '@/config/constants';
import { SEO_CONFIG } from '@/seo/config';
import { SEO_ROUTES } from '@/seo/routes';
import { SeoHead } from '@/seo/SeoHead';
import { consertoSchemas } from '@/seo/schemas';
import { Breadcrumbs, Faq, SeoCta, SeoEyebrow, SeoH2, SeoLead, Steps } from './components/SeoBlocks';

const SERVICES = [
  { label: 'Tela quebrada', desc: 'Substituição completa da tela.', href: '/troca-tela-iphone/' },
  { label: 'Bateria', desc: 'Substituição da bateria.', href: '/troca-bateria-iphone/' },
  { label: 'Vidro da tela', desc: 'Substituição somente do vidro da tela.', href: '/troca-vidro-iphone/' },
  { label: 'Vidro traseiro', desc: 'Substituição do vidro traseiro.', href: '/vidro-traseiro-iphone/' },
  { label: 'Outro problema', desc: 'Diagnóstico para outros defeitos.', href: `/agendar?servico=${SERVICE_SLUGS.other}` },
];

const STEPS = [
  { n: '01', title: 'Escolha o problema', text: 'Diga o que aconteceu com o aparelho.' },
  { n: '02', title: 'Veja o preço', text: 'O valor aparece antes de qualquer compromisso.' },
  { n: '03', title: 'Agende', text: 'Escolha dia e janela de atendimento.' },
  { n: '04', title: 'Receba o atendimento', text: 'No local ou com leva e traz, conforme o serviço.' },
  { n: '05', title: 'Pronto', text: 'Aparelho reparado com garantia conforme o serviço.' },
];

const BENEFITS = [
  { title: 'Preço antes do agendamento', text: 'Você decide com o valor na tela, sem surpresa.' },
  { title: 'Atendimento delivery', text: 'Técnico onde você estiver, sem deslocamento seu.' },
  { title: 'Garantia conforme o serviço', text: 'Cada solução informa a própria cobertura.' },
  { title: 'Até 10x sem juros', text: 'Pix à vista ou cartão parcelado.' },
  { title: 'Processo simples', text: 'Problema, modelo, preço e agendamento em minutos.' },
  { title: 'Especializada em iPhone', text: 'Um aparelho, um time, um padrão de reparo.' },
];

const FAQ = [
  {
    q: 'Vocês atendem em domicílio?',
    a: 'Sim. A iPlay atende no Rio de Janeiro com modelo delivery: troca de tela e bateria podem ser feitas no local, e outros reparos usam o serviço leva e traz.',
  },
  {
    q: 'Vou saber o preço antes de agendar?',
    a: 'Sim. Você escolhe o modelo e o serviço, confere o valor no Pix e no cartão e só então confirma o agendamento.',
  },
  {
    q: 'O reparo tem garantia?',
    a: 'Sim, com cobertura conforme a solução escolhida — cada opção informa os próprios meses de garantia antes da confirmação.',
  },
  {
    q: 'Posso parcelar o pagamento?',
    a: 'Sim, o cartão pode ser parcelado em até 10x sem juros, além da opção Pix.',
  },
];

export function ConsertoIphonePage() {
  const meta = SEO_ROUTES.conserto;
  const schemas = useMemo(() => consertoSchemas(meta, SEO_CONFIG.siteUrl), [meta]);
  return (
    <>
      <SeoHead meta={meta} schemas={schemas} />
      <div className="mx-auto w-full max-w-5xl">
        <Breadcrumbs items={[{ label: 'Início', href: '/' }, { label: 'Conserto de iPhone' }]} />

        <section className="mt-6 rounded-3xl border border-linha bg-musgo p-8 sm:p-12">
          <SeoEyebrow>Assistência especializada em iPhone</SeoEyebrow>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-gelo sm:text-5xl">
            Conserto de iPhone no Rio de Janeiro
          </h1>
          <p className="mt-4 max-w-xl text-lg text-nevoa">
            Seu iPhone deu problema? Escolha o que aconteceu, veja o preço antes de agendar e deixe o resto com a
            iPlay.
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <SeoCta to="/agendar">Ver preço do conserto</SeoCta>
            <a
              href="#como-funciona"
              className="inline-block rounded-2xl border border-linha bg-noite px-6 py-3.5 text-center font-semibold text-gelo transition hover:border-cinza"
            >
              Como funciona
            </a>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Serviços</SeoEyebrow>
          <SeoH2>O que aconteceu com seu iPhone?</SeoH2>
          <SeoLead>Escolha o problema para ver o valor do reparo.</SeoLead>
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SERVICES.map((service) => (
              <Link
                key={service.label}
                to={service.href}
                className="group block rounded-3xl border border-linha bg-musgo p-5 transition hover:border-lima active:scale-[0.99]"
              >
                <span className="block font-display text-lg font-extrabold text-gelo">{service.label}</span>
                <span className="mt-0.5 block text-sm text-cinza">{service.desc}</span>
                <span className="mt-2 block text-sm font-bold text-lima">Ver preço →</span>
              </Link>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="mt-14 scroll-mt-24">
          <SeoEyebrow>O processo</SeoEyebrow>
          <SeoH2>Do problema ao reparo em cinco passos</SeoH2>
          <Steps steps={STEPS} />
        </section>

        <section className="mt-14">
          <SeoEyebrow>Atendimento</SeoEyebrow>
          <SeoH2>Conserto de iPhone sem precisar sair de casa</SeoH2>
          <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-nevoa">
            <p>
              A iPlay atende no Rio de Janeiro com modelo delivery. Troca de tela e bateria podem ser realizadas no
              local, seguindo as regras operacionais de cada atendimento.
            </p>
            <p>
              A troca do vidro traseiro tem atendimento no local somente para modelos selecionados — a disponibilidade
              aparece no momento do agendamento. Para os demais reparos, o serviço leva e traz resolve sem você
              precisar se deslocar.
            </p>
            <p>
              O caso mais comum — tela quebrada — tem página própria com opções e preços por modelo:{' '}
              <Link to="/troca-tela-iphone/" className="font-semibold text-lima hover:underline">
                troca de tela de iPhone
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Confiança</SeoEyebrow>
          <SeoH2>Por que a iPlay?</SeoH2>
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="rounded-3xl border border-linha bg-musgo p-5">
                <p className="font-display text-lg font-extrabold text-gelo">{benefit.title}</p>
                <p className="mt-1 text-sm text-cinza">{benefit.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Dúvidas</SeoEyebrow>
          <SeoH2>Perguntas frequentes</SeoH2>
          <Faq items={FAQ} />
          <div className="mt-8 text-center">
            <SeoCta to="/agendar">Ver preço e agendar</SeoCta>
          </div>
        </section>
      </div>
    </>
  );
}
