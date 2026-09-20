import type { Section } from "@/types/builder";
import { forexFuturesForexPairsTicker } from "./forex-pairs-ticker";
import { forexFuturesFuturesContractsTable } from "./futures-contracts-table";
import { forexFuturesLeverageCalculator } from "./leverage-calculator";
import { forexFuturesGlobalMarketsMap } from "./global-markets-map";
import { forexFuturesSessionTimesHero } from "./session-times-hero";
import { forexFuturesSpreadComparison } from "./spread-comparison";
import { forexFuturesMarginRequirements } from "./margin-requirements";
import { forexFuturesEconomicCalendar } from "./economic-calendar";
import { forexFuturesProTraderTestimonials } from "./pro-trader-testimonials";
/*
 * forexFuturesRegulatedTrustBar is UNREGISTERED, deliberately kept on disk — the
 * same treatment, and the same reason, as ../ai-features/ and
 * ../staking/validator-spotlight.ts.
 *
 * The section does not merely contain a regulatory claim; it exists to make one.
 * ./regulated-trust-bar.ts:62-115 is an eyebrow reading "GLOBALLY REGULATED", a
 * heading reading "Your funds, protected by tier-1 regulators", a sub-line
 * promising "Up to £85,000 FSCS coverage for eligible UK clients", and then four
 * badges naming a real regulator each and printing a licence number against it in
 * a monospace face: FCA "Lic. #748142", CySEC "Lic. #421/22", ASIC "Lic. #512847",
 * FSA (Seychelles) "Lic. #SD148". Line 143 names the banks holding the money —
 * "Held at Barclays, HSBC, and DBS". Strip the regulators out and nothing is left
 * to register.
 *
 * None of it is backed. There is no regulator, licence-number, FSCS or insurance
 * field anywhere in the product: nothing under frontend/config/ (the only
 * "regulatory" strings there are KYC blurbs in kyc-features.ts and menu.ts), and
 * `rg -i 'fscs|lloyd|segregated account' backend/src` returns nothing. An operator
 * cannot make these true by editing, because there is nothing to edit them into.
 *
 * This is worse than the invented business metrics the guard deliberately ignores.
 * "$4.2B processed" is visibly a placeholder. A six-digit number attributed by name
 * to the Financial Conduct Authority reads as verified fact — and the number is
 * either nobody's or somebody else's. An operator who publishes this has made a
 * specific licensing representation about a financial product, in their own name.
 *
 * It survived Wave 1 task 1.1 because the guard's regulatory rule read
 * /MiFID II|FINRA|SEC-registered/, which matches none of FCA, CySEC, ASIC, FSA or
 * FSCS. tools/check-template-claims.mjs now carries a rule for the whole class.
 *
 * Re-registering it needs more than new copy: it needs operator-supplied licence
 * data to render from, and a per-operator field to hold it. Until that exists the
 * honest section is no section.
 */

export {
  forexFuturesForexPairsTicker,
  forexFuturesFuturesContractsTable,
  forexFuturesLeverageCalculator,
  forexFuturesGlobalMarketsMap,
  forexFuturesSessionTimesHero,
  forexFuturesSpreadComparison,
  forexFuturesMarginRequirements,
  forexFuturesEconomicCalendar,
  forexFuturesProTraderTestimonials,
};

export const forexFuturesTemplates: Section[] = [
  forexFuturesForexPairsTicker,
  forexFuturesFuturesContractsTable,
  forexFuturesLeverageCalculator,
  forexFuturesGlobalMarketsMap,
  forexFuturesSessionTimesHero,
  forexFuturesSpreadComparison,
  forexFuturesMarginRequirements,
  forexFuturesEconomicCalendar,
  forexFuturesProTraderTestimonials,
];
