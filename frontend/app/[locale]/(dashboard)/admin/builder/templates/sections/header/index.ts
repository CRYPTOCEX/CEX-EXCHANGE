import { headerHeroTransparent } from "./hero-transparent";
import { headerBusinessStandard } from "./business-standard";
import { headerCenteredLogo } from "./centered-logo";
import { headerSplitNav } from "./split-nav";
import { headerMegaMenu } from "./mega-menu";
import { headerStickyCta } from "./sticky-cta";
import { headerMinimalDark } from "./minimal-dark";
import { headerSaasWithAuth } from "./saas-with-auth";
import { headerCryptoTicker } from "./crypto-ticker";
import { headerGradientBar } from "./gradient-bar";

export const headerTemplates = [
  headerHeroTransparent,
  headerBusinessStandard,
  headerCenteredLogo,
  headerSplitNav,
  headerMegaMenu,
  headerStickyCta,
  headerMinimalDark,
  headerSaasWithAuth,
  headerCryptoTicker,
  headerGradientBar,
] as const;

export {
  headerHeroTransparent,
  headerBusinessStandard,
  headerCenteredLogo,
  headerSplitNav,
  headerMegaMenu,
  headerStickyCta,
  headerMinimalDark,
  headerSaasWithAuth,
  headerCryptoTicker,
  headerGradientBar,
};
