import type React from "react";
import type { Element } from "@/types/builder";

import { ButtonSettings } from "./elements/button-settings";
import { CardSettings } from "./elements/card-settings";
import { CtaSettings } from "./elements/cta-settings";
import { DividerSettings } from "./elements/divider-settings";
import { FeatureSettings } from "./elements/feature-settings";
import { GallerySettings } from "./elements/gallery-settings";
import { HeadingSettings } from "./elements/heading-settings";
import { IconSettings } from "./elements/icon-settings";
import { ImageSettings } from "./elements/image-settings";
import { ListSettings } from "./elements/list-settings";
import { NotificationSettings } from "./elements/notification-settings";
import { PricingSettings } from "./elements/pricing-settings";
import { QuoteSettings } from "./elements/quote-settings";
import { SpacerSettings } from "./elements/spacer-settings";
import { StatsSettings } from "./elements/stats-settings";
import { TestimonialSettings } from "./elements/testimonial-settings";
import { TextSettings } from "./elements/text-settings";
import { AnimatedImageGridSettings } from "./elements/animated-image-grid-settings";
import { LinkSettings } from "./elements/link-settings";
import { TrendingMarketsSettings } from "./elements/trending-markets-settings";

export interface SettingsProps {
  element: Element;
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  onElementUpdate: (updatedElement: Element) => void;
}

export const settingsMap: Record<string, React.FC<SettingsProps>> = {
  heading: HeadingSettings,
  text: TextSettings,
  list: ListSettings,
  quote: QuoteSettings,
  button: ButtonSettings,
  image: ImageSettings,
  icon: IconSettings,
  divider: DividerSettings,
  spacer: SpacerSettings,
  pricing: PricingSettings,
  testimonial: TestimonialSettings,
  stats: StatsSettings,
  cta: CtaSettings,
  notification: NotificationSettings,
  feature: FeatureSettings,
  card: CardSettings,
  gallery: GallerySettings,
  animatedImageGrid: AnimatedImageGridSettings,
  link: LinkSettings,
  trendingMarkets: TrendingMarketsSettings,
};
