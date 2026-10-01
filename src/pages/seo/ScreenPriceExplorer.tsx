import { SERVICE_SLUGS } from '@/config/constants';
import { ServicePriceExplorer } from './ServicePriceExplorer';

/** Wrapper fino: /troca-tela-iphone/ com os textos da etapa transacional. */
export function ScreenPriceExplorer() {
  return (
    <ServicePriceExplorer
      serviceSlug={SERVICE_SLUGS.screen}
      compareHeading="Compare as telas e agende"
      ctaLabel="Agendar troca da tela"
    />
  );
}
