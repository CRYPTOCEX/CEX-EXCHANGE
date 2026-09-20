import type { Section } from "@/types/builder";
import { tradingLiveChartHero } from "./live-chart-hero";
import { tradingPairTickersGrid } from "./pair-tickers-grid";
import { tradingBotStrategiesShowcase } from "./bot-strategies-showcase";
import { tradingOrderBookPreview } from "./order-book-preview";
import { tradingTradingViewEmbed } from "./trading-view-embed";
import { tradingMobileAppShowcase } from "./mobile-app-showcase";
import { tradingFeesComparison } from "./fees-comparison";
import { tradingApiDocumentationCta } from "./api-documentation-cta";
import { tradingAdvancedToolsGrid } from "./advanced-tools-grid";
import { tradingRiskDisclaimer } from "./risk-disclaimer";

export {
  tradingLiveChartHero,
  tradingPairTickersGrid,
  tradingBotStrategiesShowcase,
  tradingOrderBookPreview,
  tradingTradingViewEmbed,
  tradingMobileAppShowcase,
  tradingFeesComparison,
  tradingApiDocumentationCta,
  tradingAdvancedToolsGrid,
  tradingRiskDisclaimer,
};

export const tradingTemplates: Section[] = [
  tradingLiveChartHero,
  tradingPairTickersGrid,
  tradingBotStrategiesShowcase,
  tradingOrderBookPreview,
  tradingTradingViewEmbed,
  tradingMobileAppShowcase,
  tradingFeesComparison,
  tradingApiDocumentationCta,
  tradingAdvancedToolsGrid,
  tradingRiskDisclaimer,
];
