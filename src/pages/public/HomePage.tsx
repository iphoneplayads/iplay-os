import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { APP_CONFIG } from '@/config/app';
import { SERVICE_SLUGS } from '@/config/constants';
import { trackEvent } from '@/lib/analytics/events';
import { BeforeAfter } from '@/components/brand/BeforeAfter';
import {
  BackGlassIcon,
  BatteryIcon,
  BoltIcon,
  CalendarIcon,
  CardIcon,
  ChatIcon,
  DiagnosticIcon,
  IconChip,
  PinIcon,
  ScreenIcon,
  ShieldIcon,
  SparkIcon,
  TagIcon,
} from '@/components/brand/icons';

const WA_LINK = `https://wa.me/${APP_CONFIG.company.whatsapp}?text=${encodeURIComponent('Olá! Tenho dúvidas sobre o conserto do meu iPhone.')}`;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-lima">
      <span aria-hidden="true" className="h-px w-8 bg-lima" />
      {children}
    </p>
  );
}

const PROBLEMS = [
  { label: 'Tela quebrada', slug: SERVICE_SLUGS.screen, Icon: ScreenIcon },
  { label: 'Bateria', slug: SERVICE_SLUGS.battery, Icon: BatteryIcon },
  { label: 'Vidro traseiro', slug: SERVICE_SLUGS.backGlass, Icon: BackGlassIcon },
  { label: 'Outro problema', slug: SERVICE_SLUGS.other, Icon: DiagnosticIcon },
];

const JOURNEY = [
  { n: '01', title: 'Defeito', text: 'Você conta o que aconteceu.', Icon: ChatIcon },
  { n: '02', title: 'Valor', text: 'Você vê o preço antes de agendar.', Icon: TagIcon },
  { n: '03', title: 'Agendamento', text: 'Escolha o melhor horário.', Icon: CalendarIcon },
  { n: '04', title: 'Técnico onde você estiver', text: 'Nós vamos até você.', Icon: PinIcon },
  { n: '05', title: 'Pronto!', text: 'Seu iPhone novo de novo.', Icon: SparkIcon, highlight: true },
];

const BENEFIT_ROWS = [
  { text: 'Veja o preço antes de agendar', Icon: TagIcon },
  { text: 'Agendamento rápido', Icon: BoltIcon },
  { text: 'Serviço com garantia', Icon: ShieldIcon },
  { text: 'Até 10x sem juros', Icon: CardIcon },
];

export function HomePage() {
  useEffect(() => {
    trackEvent('page_view', { page: 'home' });
  }, []);

  return (
    <div>
      {/* ============ HERO ============ */}
      <section
        className="rounded-3xl border border-linha p-8 sm:p-12 lg:p-16"
        style={{ background: 'radial-gradient(1000px 440px at 100% 0%, #1a2b12 0, transparent 60%), #0A0F0D' }}
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-linha bg-musgo px-3 py-1 text-xs font-bold text-gelo">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-lima" />
              Atendimento delivery
            </p>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-gelo sm:text-5xl xl:text-6xl">
              Seu iPhone deu problema?
              <br />
              <span className="text-lima">A gente resolve onde você estiver.*</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-nevoa sm:text-lg">
              Escolha o modelo, veja o preço antes de agendar e deixe o resto com a iPlay.
            </p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/agendar"
                onClick={() => trackEvent('booking_started', { entry: 'home_cta' })}
                className="min-h-[52px] rounded-2xl bg-lima px-6 py-4 text-center text-base font-bold text-noite transition hover:brightness-110 active:scale-[0.99] sm:text-lg"
              >
                Ver preço e agendar
              </Link>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noreferrer"
                aria-label="Tenho dúvidas — conversar no WhatsApp"
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-linha bg-musgo px-6 py-4 text-center text-base font-semibold text-gelo transition hover:border-cinza sm:text-lg"
              >
                <ChatIcon className="h-5 w-5 text-lima" />
                Tenho dúvidas
              </a>
            </div>
          </div>
          {/* Assets definitivos em /public/brand (mesmo aparelho/enquadramento) */}
          <BeforeAfter beforeSrc="/brand/iphone-broken.png" afterSrc="/brand/iphone-repaired.png" />
        </div>
        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-nevoa">
          *Trocas de tela, bateria e vidro traseiro são realizadas no local para modelos selecionados.
          Para outros problemas ou modelos, contamos com serviço leva e traz. Consulte os modelos e
          serviços disponíveis.
        </p>
      </section>

      {/* ============ SERVIÇOS ============ */}
      <section className="mt-20 sm:mt-24">
        <Eyebrow>Serviços</Eyebrow>
        <h2 className="mt-3 font-display text-3xl font-extrabold text-gelo sm:text-4xl">
          O que aconteceu com seu iPhone?
        </h2>
        <p className="mt-2 text-base text-cinza">Escolha o problema e descubra o valor do reparo.</p>
        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map(({ label, slug, Icon }) => (
            <Link
              key={slug}
              to={`/agendar?servico=${slug}`}
              onClick={() => trackEvent('booking_started', { entry: 'home_problem', serviceSlug: slug })}
              className="group rounded-3xl border border-linha bg-musgo p-7 transition hover:border-lima active:scale-[0.99] sm:p-8"
            >
              <IconChip size={128}><Icon /></IconChip>
              <p className="mt-5 font-display text-2xl font-extrabold text-gelo">{label}</p>
              <p className="mt-2 text-sm font-bold text-lima">
                Ver preço →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ JORNADA ============ */}
      <section className="mt-20 sm:mt-24">
        <Eyebrow>A jornada</Eyebrow>
        <h2 className="mt-3 font-display text-3xl font-extrabold text-gelo sm:text-4xl">
          Você chama. Nós cuidamos do resto.
        </h2>
        <p className="mt-2 text-base text-cinza">Do primeiro clique até o reparo concluído.</p>
        <div className="relative mt-10">
          <div aria-hidden="true" className="absolute bottom-4 left-[31px] top-4 w-px bg-linha lg:bottom-auto lg:left-10 lg:right-10 lg:top-[31px] lg:h-px lg:w-auto" />
          <ol className="relative grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-4">
            {JOURNEY.map(({ n, title, text, Icon, highlight }) => (
              <li key={n} className="flex gap-5 lg:block">
                <span
                  aria-hidden="true"
                  className={`inline-flex h-16 w-16 flex-none items-center justify-center rounded-2xl border font-display text-base font-extrabold ${
                    highlight ? 'border-lima bg-lima text-noite' : 'border-linha bg-musgo text-lima'
                  }`}
                >
                  {n}
                </span>
                <div className="lg:mt-4">
                  <p className="flex items-center gap-2 font-display text-lg font-extrabold text-gelo">
                    <Icon className="h-5 w-5 text-lima" />
                    {title.toUpperCase()}
                  </p>
                  <p className="mt-1 text-sm text-cinza">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div aria-hidden="true" className="ml-[31px] h-8 w-px bg-gradient-to-b from-linha to-lima lg:mx-auto" />
        <div className="relative rounded-3xl bg-lima p-8 text-noite sm:p-10">
          <span aria-hidden="true" className="absolute -top-[9px] left-[23px] h-[18px] w-[18px] rotate-45 bg-lima lg:left-1/2 lg:-translate-x-1/2" />
          <p className="inline-block rounded-full bg-noite px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-lima">
            CHEGADA
          </p>
          <p className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">PRONTO!</p>
          <p className="mt-2 text-lg font-bold">Seu iPhone novo de novo.</p>
          <Link
            to="/agendar"
            onClick={() => trackEvent('booking_started', { entry: 'home_journey' })}
            className="mt-5 inline-block rounded-2xl bg-noite px-6 py-3.5 font-bold text-gelo transition hover:brightness-150"
          >
            Começar agora
          </Link>
        </div>
      </section>

      {/* ============ DELIVERY ============ */}
      <section className="mt-20 overflow-hidden rounded-3xl border border-linha bg-musgo sm:mt-24">
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:p-14">
          <div>
            <Eyebrow>Delivery</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-gelo sm:text-4xl">
              Você não precisa sair de casa.
            </h2>
            <p className="mt-3 font-display text-2xl font-extrabold text-lima">
              Nós vamos até você.
            </p>
            <p className="mt-3 text-base text-nevoa">
              Casa, trabalho ou escritório. Você chama, nós cuidamos do resto.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Casa', 'Trabalho', 'Escritório'].map((place) => (
                <span key={place} className="inline-flex items-center gap-1.5 rounded-full border border-linha bg-noite px-3 py-1.5 text-xs font-bold text-gelo">
                  <PinIcon className="h-3.5 w-3.5 text-lima" />
                  {place}
                </span>
              ))}
            </div>
            <Link
              to="/agendar"
              onClick={() => trackEvent('booking_started', { entry: 'home_delivery' })}
              className="mt-6 inline-block rounded-2xl bg-lima px-6 py-3.5 font-bold text-noite transition hover:brightness-110"
            >
              Ver preço e agendar
            </Link>
          </div>
          {/* SLOT FOTO (futuro): atendimento delivery real — técnico iPlay chegando
              ao cliente. Proporção ~4:3, com overlay escuro para manter o clima. */}
          <svg viewBox="0 0 400 280" role="img" aria-label="Rota do técnico até você" className="h-auto w-full">
            <ellipse cx="200" cy="150" rx="180" ry="110" fill="none" stroke="#26322B" strokeWidth="1.5" opacity="0.7" />
            <ellipse cx="200" cy="150" rx="130" ry="78" fill="none" stroke="#26322B" strokeWidth="1" strokeDasharray="4 6" opacity="0.7" />
            <path d="M20 235 C 110 225, 140 150, 210 140 S 330 95, 380 55" fill="none" stroke="#B4F000" strokeWidth="2.5" strokeDasharray="9 8" strokeLinecap="round" />
            <path d="M40 90 C 120 100, 180 70, 250 80" fill="none" stroke="#26322B" strokeWidth="1.5" strokeDasharray="4 6" />
            <g>
              <circle cx="20" cy="235" r="17" fill="none" stroke="#9AA39E" strokeWidth="2" />
              <circle cx="20" cy="235" r="6" fill="#9AA39E" />
              <text x="20" y="265" textAnchor="middle" fill="#9AA39E" fontSize="12" fontWeight="700">iPlay</text>
            </g>
            <g>
              <circle cx="380" cy="55" r="34" fill="none" stroke="#B4F000" strokeWidth="1" strokeDasharray="4 5" opacity="0.6" />
              <circle cx="380" cy="55" r="24" fill="rgba(180,240,0,0.15)" />
              <circle cx="380" cy="55" r="17" fill="none" stroke="#B4F000" strokeWidth="2" />
              <circle cx="380" cy="55" r="6" fill="#B4F000" />
              <text x="380" y="100" textAnchor="middle" fill="#B4F000" fontSize="12" fontWeight="700">Você</text>
            </g>
            <g transform="translate(196,124)">
              <rect x="-38" y="-15" width="76" height="30" rx="15" fill="#0A0F0D" stroke="#B4F000" strokeWidth="1.5" />
              <text textAnchor="middle" dy="5" fill="#F5F6F2" fontSize="12" fontWeight="700">a caminho</text>
            </g>
          </svg>
        </div>
      </section>

      {/* ============ POR QUE ============ */}
      <section className="mt-20 sm:mt-24">
        <Eyebrow>Confiança</Eyebrow>
        <h2 className="mt-3 font-display text-3xl font-extrabold text-gelo sm:text-4xl">
          Por que a iPlay?
        </h2>
        <div className="mt-7 grid gap-3 lg:grid-cols-2">
          <div className="rounded-3xl border border-lima/40 bg-musgo p-8 sm:p-10">
            <IconChip size={72}><PinIcon /></IconChip>
            <p className="mt-5 font-display text-2xl font-extrabold text-gelo sm:text-3xl">
              Atendimento onde você estiver
            </p>
            <p className="mt-2 text-base text-cinza">
              Casa, trabalho ou escritório. Você chama, nós cuidamos do resto.
            </p>
          </div>
          <ul className="rounded-3xl border border-linha bg-musgo px-6 py-2 sm:px-8">
            {BENEFIT_ROWS.map(({ text, Icon }) => (
              <li key={text} className="flex items-center gap-5 border-t border-linha py-6 first:border-t-0">
                <IconChip size={52}><Icon /></IconChip>
                <p className="font-display text-xl font-extrabold text-gelo">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section
        className="relative mt-20 overflow-hidden rounded-3xl border border-linha p-8 text-center sm:mt-24 sm:p-14"
        style={{ background: 'radial-gradient(700px 320px at 50% 0%, #1a2b12 0, transparent 65%), #0A0F0D' }}
      >
        <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 opacity-60">
          <circle cx="100" cy="100" r="70" fill="none" stroke="#26322B" strokeWidth="1" />
          <circle cx="100" cy="100" r="88" fill="none" stroke="#26322B" strokeWidth="1" strokeDasharray="3 6" />
          <circle cx="100" cy="12" r="2.5" fill="#B4F000" />
        </svg>
        <div className="relative">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-gelo sm:text-5xl">
          Seu iPhone em <span className="text-lima">boas mãos.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-nevoa">
          Escolha seu modelo, veja o preço e agende seu atendimento.
        </p>
        <Link
          to="/agendar"
          onClick={() => trackEvent('booking_started', { entry: 'home_final' })}
          className="mt-7 inline-block min-h-[52px] rounded-2xl bg-lima px-8 py-4 text-base font-bold text-noite transition hover:brightness-110 active:scale-[0.99] sm:text-lg"
        >
          Ver preço e agendar
        </Link>
        </div>
      </section>
    </div>
  );
}
