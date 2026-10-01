import { useMemo } from 'react';
import { SERVICE_SLUGS } from '@/config/constants';
import { SEO_CONFIG } from '@/seo/config';
import { SEO_ROUTES } from '@/seo/routes';
import { SeoHead } from '@/seo/SeoHead';
import { vidroTraseiroSchemas } from '@/seo/schemas';
import { Breadcrumbs, Faq, SeoCta, SeoEyebrow, SeoH2, SeoLead, Steps } from './components/SeoBlocks';
import { ServicePriceExplorer } from './ServicePriceExplorer';

const STEPS = [
  { n: '01', title: 'Escolha o modelo', text: 'Selecione a família e o modelo do seu iPhone.' },
  { n: '02', title: 'Veja o preço', text: 'Valor no Pix e no cartão antes de qualquer compromisso.' },
  { n: '03', title: 'Confira o atendimento', text: 'No local para modelos selecionados ou leva e traz.' },
  { n: '04', title: 'Agende', text: 'Dia e janela conforme a disponibilidade.' },
  { n: '05', title: 'Pronto', text: 'Traseira renovada, com garantia conforme o serviço.' },
];

const FAQ = [
  {
    q: 'O atendimento é feito no local para qualquer modelo?',
    a: 'Não necessariamente. O atendimento no local está disponível para modelos selecionados — consulte a disponibilidade no momento do agendamento.',
  },
  {
    q: 'E se o meu modelo não tiver atendimento no local?',
    a: 'A operação pode utilizar o serviço leva e traz, sem você precisar se deslocar.',
  },
  {
    q: 'A troca do vidro traseiro tem garantia?',
    a: 'Sim, com cobertura conforme o serviço contratado — o prazo aparece junto do preço antes da confirmação.',
  },
  {
    q: 'Vocês vão até minha casa?',
    a: 'Para os modelos com atendimento no local disponível, sim — no Rio de Janeiro, dentro da janela agendada. Nos demais casos, funciona o leva e traz.',
  },
  {
    q: 'Posso pagar parcelado?',
    a: 'Sim. Além do Pix, o cartão pode ser parcelado em até 10x sem juros, com o valor total exibido antes da confirmação.',
  },
];

export function VidroTraseiroIphonePage() {
  const meta = SEO_ROUTES.vidroTraseiro;
  const schemas = useMemo(() => vidroTraseiroSchemas(meta, SEO_CONFIG.siteUrl), [meta]);
  return (
    <>
      <SeoHead meta={meta} schemas={schemas} />
      <div className="mx-auto w-full max-w-5xl">
        <Breadcrumbs
          items={[
            { label: 'Início', href: '/' },
            { label: 'Conserto de iPhone', href: '/conserto-iphone/' },
            { label: 'Vidro traseiro' },
          ]}
        />

        <section className="mt-6 rounded-3xl border border-linha bg-musgo p-8 sm:p-12">
          <SeoEyebrow>Troca de vidro traseiro de iPhone</SeoEyebrow>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-gelo sm:text-5xl">
            Troca de vidro traseiro de iPhone no Rio de Janeiro
          </h1>
          <p className="mt-4 max-w-xl text-lg text-nevoa">
            Vidro traseiro quebrado? Escolha seu modelo, veja o preço e consulte a forma de atendimento disponível.
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
          <SeoH2>Quanto custa trocar o vidro traseiro?</SeoH2>
          <SeoLead>Valores reais, direto do nosso catálogo — iguais aos do agendamento.</SeoLead>
          <div className="mt-6">
            <ServicePriceExplorer
              serviceSlug={SERVICE_SLUGS.backGlass}
              compareHeading="Confira o valor e a disponibilidade"
              ctaLabel="Agendar troca do vidro traseiro"
            />
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>Atendimento</SeoEyebrow>
          <SeoH2>Como funciona o atendimento do vidro traseiro?</SeoH2>
          <div className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-nevoa">
            <p>
              Atendimento no local disponível para modelos selecionados — consulte a disponibilidade. A regra existe
              porque o reparo do vidro traseiro exige condições específicas conforme o modelo.
            </p>
            <p>
              Quando o atendimento no local não for possível para o seu modelo, a operação utiliza o serviço leva e
              traz: você agenda, entregamos e devolvemos sem deslocamento seu.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <SeoEyebrow>O processo</SeoEyebrow>
          <SeoH2>Do modelo ao reparo</SeoH2>
          <Steps steps={STEPS} />
        </section>

        <section className="mt-14">
          <SeoEyebrow>Dúvidas</SeoEyebrow>
          <SeoH2>Perguntas frequentes</SeoH2>
          <Faq items={FAQ} />
          <div className="mt-8 text-center">
            <SeoCta to={`/agendar?servico=${SERVICE_SLUGS.backGlass}`}>Agendar troca do vidro traseiro</SeoCta>
          </div>
        </section>
      </div>
    </>
  );
}
