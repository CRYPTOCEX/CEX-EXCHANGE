/**
 * Section-template registry.
 *
 * This file is the single source of truth for every section template exposed
 * to the builder's "Insert Section" modal. When you add a new category:
 *
 *   1. Create `<category>/<slug>.ts` files that export one `Section` each.
 *   2. Create `<category>/index.ts` that re-exports them and assembles a
 *      `<category>Templates` array (see existing categories for the pattern).
 *   3. Import the array below and register it in `sectionTemplates`.
 *
 * Templates are stored with stable slug ids; the `freshenIds` helper in
 * `templates/utils.ts` regenerates runtime ids when a template is inserted,
 * so the same template can be placed multiple times on one page.
 */

import type { Section } from "@/types/builder";

// Universal structural categories
import { heroTemplates } from "./hero";
import { featuresTemplates } from "./features";
import { ctaTemplates } from "./cta";
import { pricingTemplates } from "./pricing";
import { testimonialsTemplates } from "./testimonials";
import { statsTemplates } from "./stats";
import { headerTemplates } from "./header";
import { footerTemplates } from "./footer";

// Universal content categories
import { aboutTemplates } from "./about";
import { teamTemplates } from "./team";
import { contactTemplates } from "./contact";
import { faqTemplates } from "./faq";
import { logoCloudTemplates } from "./logo-cloud";
import { newsletterTemplates } from "./newsletter";
import { blogTemplates } from "./blog";

// Extension showcases
import { tradingTemplates } from "./trading";
import { forexFuturesTemplates } from "./forex-futures";
import { copyTradingTemplates } from "./copy-trading";
import { nftTemplates } from "./nft";
import { stakingTemplates } from "./staking";
import { icoLaunchpadTemplates } from "./ico-launchpad";
import { p2pTemplates } from "./p2p";
import { ecommerceTemplates } from "./ecommerce";
import { affiliateTemplates } from "./affiliate";

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export const sectionCategories = [
  // Structural
  "header",
  "hero",
  "features",
  "cta",
  "pricing",
  "testimonials",
  "stats",
  "footer",
  // Content
  "about",
  "team",
  "contact",
  "faq",
  "logo-cloud",
  "newsletter",
  "blog",
  // Extension showcases
  "trading",
  "forex-futures",
  "copy-trading",
  "nft",
  "staking",
  "ico-launchpad",
  "p2p",
  "ecommerce",
  "affiliate",
] as const;

export type SectionCategory = (typeof sectionCategories)[number];

/**
 * User-facing display metadata per category (icon name is an Iconify id; use
 * `lucide:*` wherever possible for consistency with the rest of the builder).
 */
export interface CategoryMeta {
  id: SectionCategory;
  label: string;
  description: string;
  icon: string;
  /** Extension key this category showcases. Generic categories omit this. */
  extension?:
    | "trading-bot"
    | "forex"
    | "futures"
    | "copy-trading"
    | "nft"
    | "staking"
    | "ico"
    | "p2p"
    | "ecommerce"
    | "affiliate"
    | "ai";
}

export const categoryMeta: Record<SectionCategory, CategoryMeta> = {
  header: { id: "header", label: "Header", description: "Site navigation bars", icon: "lucide:layout-top" },
  hero: { id: "hero", label: "Hero", description: "Above-the-fold landing sections", icon: "lucide:sparkles" },
  features: { id: "features", label: "Features", description: "Product-feature layouts", icon: "lucide:layout-grid" },
  cta: { id: "cta", label: "Call to Action", description: "Conversion and sign-up sections", icon: "lucide:megaphone" },
  pricing: { id: "pricing", label: "Pricing", description: "Pricing tiers and tables", icon: "lucide:tag" },
  testimonials: { id: "testimonials", label: "Testimonials", description: "Social proof and quotes", icon: "lucide:quote" },
  stats: { id: "stats", label: "Stats", description: "Metrics and counters", icon: "lucide:bar-chart-3" },
  footer: { id: "footer", label: "Footer", description: "Site footers", icon: "lucide:layout-bottom" },
  about: { id: "about", label: "About", description: "Company story and mission", icon: "lucide:book-open" },
  team: { id: "team", label: "Team", description: "Team member grids", icon: "lucide:users" },
  contact: { id: "contact", label: "Contact", description: "Contact forms and info", icon: "lucide:mail" },
  faq: { id: "faq", label: "FAQ", description: "Frequently asked questions", icon: "lucide:help-circle" },
  "logo-cloud": { id: "logo-cloud", label: "Logo Cloud", description: "Trusted-by and partner logos", icon: "lucide:badge-check" },
  newsletter: { id: "newsletter", label: "Newsletter", description: "Email capture sections", icon: "lucide:send" },
  blog: { id: "blog", label: "Blog", description: "Blog and article grids", icon: "lucide:newspaper" },

  trading: { id: "trading", label: "Trading", description: "Spot trading and bot showcases", icon: "lucide:candlestick-chart", extension: "trading-bot" },
  "forex-futures": { id: "forex-futures", label: "Forex & Futures", description: "Forex and futures markets", icon: "lucide:line-chart", extension: "forex" },
  "copy-trading": { id: "copy-trading", label: "Copy Trading", description: "Follow and copy top traders", icon: "lucide:users-round", extension: "copy-trading" },
  nft: { id: "nft", label: "NFT", description: "NFT marketplace sections", icon: "lucide:image", extension: "nft" },
  staking: { id: "staking", label: "Staking", description: "Staking pools and rewards", icon: "lucide:coins", extension: "staking" },
  "ico-launchpad": { id: "ico-launchpad", label: "ICO Launchpad", description: "Token sales and launchpads", icon: "lucide:rocket", extension: "ico" },
  p2p: { id: "p2p", label: "P2P", description: "Peer-to-peer trading", icon: "lucide:handshake", extension: "p2p" },
  ecommerce: { id: "ecommerce", label: "E-commerce", description: "Shop and product sections", icon: "lucide:shopping-bag", extension: "ecommerce" },
  affiliate: { id: "affiliate", label: "Affiliate", description: "Affiliate program sections", icon: "lucide:link", extension: "affiliate" },
};

/* -------------------------------------------------------------------------- */
/* Template registry                                                          */
/* -------------------------------------------------------------------------- */

export const sectionTemplates: Record<SectionCategory, readonly Section[]> = {
  header: headerTemplates,
  hero: heroTemplates,
  features: featuresTemplates,
  cta: ctaTemplates,
  pricing: pricingTemplates,
  testimonials: testimonialsTemplates,
  stats: statsTemplates,
  footer: footerTemplates,

  about: aboutTemplates,
  team: teamTemplates,
  contact: contactTemplates,
  faq: faqTemplates,
  "logo-cloud": logoCloudTemplates,
  newsletter: newsletterTemplates,
  blog: blogTemplates,

  trading: tradingTemplates,
  "forex-futures": forexFuturesTemplates,
  "copy-trading": copyTradingTemplates,
  nft: nftTemplates,
  staking: stakingTemplates,
  "ico-launchpad": icoLaunchpadTemplates,
  p2p: p2pTemplates,
  ecommerce: ecommerceTemplates,
  affiliate: affiliateTemplates,
};

/* -------------------------------------------------------------------------- */
/* Accessors — these are the public surface consumed by the modals            */
/* -------------------------------------------------------------------------- */

export function getAllCategories(): SectionCategory[] {
  return [...sectionCategories];
}

export function getSectionCategories(): SectionCategory[] {
  return getAllCategories();
}

export function getCategoryMeta(category: string): CategoryMeta | null {
  return (categoryMeta as Record<string, CategoryMeta | undefined>)[category] ?? null;
}

/** All templates in a category, in registered order. */
export function getTemplates(category: string): Section[] {
  const key = category as SectionCategory;
  const arr = sectionTemplates[key];
  return arr ? [...arr] : [];
}

/** Alias preserved for older callers. */
export function getSectionsByCategory(category: string): Section[] {
  return getTemplates(category);
}

/** Every registered template, flattened across categories. */
export function getAllSections(): Section[] {
  return Object.values(sectionTemplates).flatMap((arr) => [...arr]);
}

/** Resolve a template by its stable slug (section.id). Falls back to null. */
export function getTemplate(category: string, id: string): Section | null {
  const list = getTemplates(category);
  return list.find((s) => s.id === id) ?? null;
}

export function getSectionTemplate(category: SectionCategory, id: string): Section | null {
  return getTemplate(category, id);
}

/* -------------------------------------------------------------------------- */
/* Metadata registry (for the selector UI — derived from the templates)       */
/* -------------------------------------------------------------------------- */

export interface SectionTemplateMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  previewImage?: string;
}

function buildTemplateMeta(section: Section): SectionTemplateMeta {
  return {
    id: section.id,
    name: section.name || section.id,
    description: section.description || "",
    category: section.category || "",
    thumbnail: section.snapshots?.card,
    previewImage: section.snapshots?.preview,
  };
}

export const sectionTemplateRegistry: Record<string, Record<string, SectionTemplateMeta>> =
  Object.fromEntries(
    sectionCategories.map((cat) => [
      cat,
      Object.fromEntries(
        getTemplates(cat).map((tpl) => [tpl.id, buildTemplateMeta(tpl)])
      ),
    ])
  );

export function getTemplatesByCategory(category: string): SectionTemplateMeta[] {
  return Object.values(sectionTemplateRegistry[category] || {});
}

export function getTemplateMetadata(category: string, templateId: string): SectionTemplateMeta | null {
  return sectionTemplateRegistry[category]?.[templateId] || null;
}

/* -------------------------------------------------------------------------- */
/* Loader helpers (back-compat with legacy async signature)                   */
/* -------------------------------------------------------------------------- */

export async function loadSectionTemplate(category: string, templateId: string): Promise<Section | null> {
  return getTemplate(category, templateId);
}

export default sectionTemplates;
