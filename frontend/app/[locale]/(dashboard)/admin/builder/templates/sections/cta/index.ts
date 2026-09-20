import { ctaCenteredGradient } from "./centered-gradient";
import { ctaSplitImage } from "./split-image";
import { ctaNewsletterInline } from "./newsletter-inline";
import { ctaDarkCard } from "./dark-card";
import { ctaFullBleedVideo } from "./full-bleed-video";
import { ctaGradientBorder } from "./gradient-border";
import { ctaBadgeAbove } from "./badge-above";
import { ctaDoubleCta } from "./double-cta";
import { ctaTestimonialCta } from "./testimonial-cta";
import { ctaCountdownCta } from "./countdown-cta";

export const ctaTemplates = [
  ctaCenteredGradient,
  ctaSplitImage,
  ctaNewsletterInline,
  ctaDarkCard,
  ctaFullBleedVideo,
  ctaGradientBorder,
  ctaBadgeAbove,
  ctaDoubleCta,
  ctaTestimonialCta,
  ctaCountdownCta,
] as const;

export {
  ctaCenteredGradient,
  ctaSplitImage,
  ctaNewsletterInline,
  ctaDarkCard,
  ctaFullBleedVideo,
  ctaGradientBorder,
  ctaBadgeAbove,
  ctaDoubleCta,
  ctaTestimonialCta,
  ctaCountdownCta,
};
