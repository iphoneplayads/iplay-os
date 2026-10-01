import { useMemo } from 'react';
import { SERVICE_SLUGS } from '@/config/constants';
import { SEO_CONFIG } from '@/seo/config';
import { SEO_ROUTES } from '@/seo/routes';
import { SeoHead } from '@/seo/SeoHead';
import { bateriaSchemas } from '@/seo/schemas';
import { Breadcrumbs, Faq, SeoCta, SeoEyebrow, SeoH2, SeoLead, Steps } from './components/SeoBlocks';
import { ServicePriceExplorer } from './ServicePriceExplorer';

const STEPS = [
  { n: '01', title: 'Escolha o modelo', text: 'Selecione a família e o modelo do seu iPhone.' },
  { n: '02', title: 'Veja o preço', text: 'Valor no Pix e no cartão antes de qualquer compromisso.' },
  { n: '03', title: 'Agende', text: 'Dia e janela de atendimento delivery.' },
  { n: '04', title: 'Receba o técnico', text: 'Troca realizada no local, onde você estiver.' },
  { n: '05', title: 'Pronto', text: 'Autonomia renovada, com garantia conforme o serviço.' },
];

const FAQ = [
  {
    q: 'Quando vale a pena trocar a bateria?',
    a: 'Quando a autonomia cai muito no uso normal, o aparelho desliga inesperadamente ou o próprio iPhone indica necessidade de manutenção da bateria.',
  },
  {
    q: 'O que é a Saúde da Bateria do iPhone?',
    a: 'É o indicador do próprio iOS sobre o estado da bateria. Quedas relevantes de capacidade costumam vir acompanhadas de autonomia menor — e é um bom sinal de que está na hora de avaliar a troca.',
  },
  {
    q: 'A troca de bateria tem garantia?',
    a: 'Sim, com cobertura conforme o serviço contratado — o prazo aparece junto do preço antes da confirmação.',
  },
  {
    q: 'Vocês vão até minha casa?',
    a: 'Sim. A troca de bateria pode ser feita em domicílio ou no local onde você estiver, no Rio de Janeiro, dentro da janela agendada.',
  },
  {
    q: 'Posso pagar parcelado?',
    a: 'Sim. Além do Pix, o cartão pode ser parcelado em até 10x sem juros, com o valor total exibido antes da confirmação.',
  },
];

export function TrocaBateriaIphonePage() {
  const meta = SEO_ROUTES.trocaBateria;
  const schemas = useMemo(() => bateriaSchemas(meta, SEO_CONFIG.siteUrl), [meta]);
  return (
    <>
      <SeoHead meta={meta} schemas={schemas} />
      <div className="mx-auto w-full max-w-5xl">
        <Breadcrumbs
          items={[
            { label: 'Início', href: '/' },
            { label: 'Conserto de iPhone', href: '/conserto-iphone/' },
            { label: 'Troca de bateria' },
          ]}
        />

        <section className="mt-6 rounded-3xl border border-linha bg-musgo p-8 sm:p-12">
          <SeoEyebrow>Troca de bateria de iPhone</SeoEyebrow>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-gelo sm:text-5xl">
            Troca de bateria de iPhone no Rio de Janeiro
          </h1>
          <p className="mt-4 max-w-xl text-lg text-nevoa">
            A bateria está durando pouco, desligando inesperadamente ou indicando necessidade de manutenção? Escolha
            seu iPhone, veja o preço e agende.
          </p>
          <div className="mt-7">
            <a
              href="#modelos"
              className="inline-block rounded-2xl bg-lima px-6 py-3.5 text-center font-bold text-noite transition hover:brightness-110 active:scale-[0.99]"
            >
              Ver preço da bateria
            </a>
          </div>
        </section>

        <section id="modelos" className="mt-14 scroll-mt-24">
          <SeoEyebrow>Preço por modelo</SeoEyebrow>
          <SeoH2>Quanto custa trocar a bateria do seu iPhone?</SeoH2>
          <SeoLead>Valores reais, direto do nosso catálogo — iguais aos do agendamento.</SeoLead>
          <div className="mt-6">
            <ServicePriceExplorer
              serviceSlug={SERVICE_SLUGS.battery}
              compareHeading="Confira o valor e agende"
              ctaLabel="Agendar troca da bateria"
            />
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Sinais</SeoEyebrow>
          <SeoH2>Quando trocar a bateria do iPhone?</SeoH2>
          <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-nevoa">
            <p>
              Bateria costuma pedir troca quando a autonomia cai muito no uso do dia a dia, o aparelho desliga sozinho
              mesmo com carga aparente ou o sistema passa a indicar necessidade de manutenção.
            </p>
            <p>
              Comportamentos anormais ligados à alimentação — como reinicializações em tarefas simples — também entram
              na lista de sinais que merecem avaliação, sem que isso seja um diagnóstico fechado antes do atendimento.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Saúde da bateria</SeoEyebrow>
          <SeoH2>O que é a Saúde da Bateria do iPhone?</SeoH2>
          <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-nevoa">
            <p>
              É a leitura que o próprio iOS mostra sobre a condição da bateria. Ela cai naturalmente com o tempo e com
              os ciclos de carga — quando a capacidade indicada está bem abaixo da original e a autonomia já incomoda,
              a troca é o caminho usual.
            </p>
            <p>
              Não existe um número único que obrigue a troca: o que manda é a combinação entre o indicador e a sua
              experiência de uso.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>O processo</SeoEyebrow>
          <SeoH2>Como funciona a troca de bateria com a iPlay?</SeoH2>
          <Steps steps={STEPS} />
        </section>

        <section className="mt-14">
          <SeoEyebrow>Delivery</SeoEyebrow>
          <SeoH2>Atendimento sem precisar sair de casa</SeoH2>
          <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-nevoa">
            <p>
              A troca de bateria é feita onde você estiver, no Rio de Janeiro, dentro da janela agendada — em casa, no
              trabalho ou onde for mais conveniente.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Dúvidas</SeoEyebrow>
          <SeoH2>Perguntas frequentes</SeoH2>
          <Faq items={FAQ} />
          <div className="mt-8 text-center">
            <SeoCta to={`/agendar?servico=${SERVICE_SLUGS.battery}`}>Agendar troca da bateria</SeoCta>
          </div>
        </section>
      </div>
    </>
  );
}
