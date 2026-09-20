import { footerFiveColumn } from "./five-column";
import { footerNewsletterColumn } from "./newsletter-column";
import { footerMinimalDark } from "./minimal-dark";
import { footerMegaFooter } from "./mega-footer";
import { footerCenteredBrand } from "./centered-brand";
import { footerSocialFirst } from "./social-first";
import { footerTradingDisclaimer } from "./trading-disclaimer";
import { footerCompactLinks } from "./compact-links";
import { footerSplitCta } from "./split-cta";
import { footerAppDownload } from "./app-download";

export const footerTemplates = [
  footerFiveColumn,
  footerNewsletterColumn,
  footerMinimalDark,
  footerMegaFooter,
  footerCenteredBrand,
  footerSocialFirst,
  footerTradingDisclaimer,
  footerCompactLinks,
  footerSplitCta,
  footerAppDownload,
] as const;

export {
  footerFiveColumn,
  footerNewsletterColumn,
  footerMinimalDark,
  footerMegaFooter,
  footerCenteredBrand,
  footerSocialFirst,
  footerTradingDisclaimer,
  footerCompactLinks,
  footerSplitCta,
  footerAppDownload,
};
