import type { Section } from "@/types/builder";

// Hero Sections
import { tradingHero } from "./hero/trading-hero";
import { cryptoHero } from "./hero/crypto-hero";
import { investmentHero } from "./hero/investment-hero";
import { modernHero } from "./hero/modern-hero";

// Features Sections
import { tradingFeatures } from "./features/trading-features";
import { securityFeatures } from "./features/security-features";
import { platformFeatures } from "./features/platform-features";

// Statistics Sections
import { tradingStats } from "./stats/trading-stats";
import { performanceStats } from "./stats/performance-stats";
import { globalStats } from "./stats/global-stats";

// Testimonials Sections
import { clientTestimonials } from "./testimonials/client-testimonials";
import { traderTestimonials } from "./testimonials/trader-testimonials";

// Pricing Sections
import { tradingPlans } from "./pricing/trading-plans";
import { premiumPlans } from "./pricing/premium-plans";

// About Sections
import { aboutCompany } from "./about/about-company";
import { teamSection } from "./about/team-section";

// Contact Sections
import { contactForm } from "./contact/contact-form";
import { supportCenter } from "./contact/support-center";

// CTA Sections
import { startTrading } from "./cta/start-trading";
import { joinPlatform } from "./cta/join-platform";

// News & Updates
import { marketNews } from "./news/market-news";
import { platformUpdates } from "./news/platform-updates";

// Educational Sections
import { tradingEducation } from "./education/trading-education";
import { marketAnalysis } from "./education/market-analysis";

// Define section categories
export const sectionCategories = [
  "hero",
  "features", 
  "stats",
  "testimonials",
  "pricing",
  "about",
  "contact",
  "cta",
  "news",
  "education"
] as const;

export type SectionCategory = typeof sectionCategories[number];

// Define section templates by category
export const sectionTemplates: Record<SectionCategory, Section[]> = {
  hero: [
    tradingHero,
    cryptoHero,
    investmentHero,
    modernHero
  ],
  features: [
    tradingFeatures,
    securityFeatures,
    platformFeatures
  ],
  stats: [
    tradingStats,
    performanceStats,
    globalStats
  ],
  testimonials: [
    clientTestimonials,
    traderTestimonials
  ],
  pricing: [
    tradingPlans,
    premiumPlans
  ],
  about: [
    aboutCompany,
    teamSection
  ],
  contact: [
    contactForm,
    supportCenter
  ],
  cta: [
    startTrading,
    joinPlatform
  ],
  news: [
    marketNews,
    platformUpdates
  ],
  education: [
    tradingEducation,
    marketAnalysis
  ]
};

// Template registry for backward compatibility
const templates: Record<string, Record<string, Section>> = {};

// Initialize templates registry
Object.entries(sectionTemplates).forEach(([category, sections]) => {
  templates[category] = {};
  sections.forEach(section => {
    templates[category][section.id] = section;
  });
});

// Helper functions
export function getSectionCategories(): SectionCategory[] {
  return sectionCategories as unknown as SectionCategory[];
}

export function getSectionsByCategory(category: SectionCategory): Section[] {
  return sectionTemplates[category] || [];
}

export function getSectionTemplate(category: SectionCategory, id: string): Section | null {
  const sections = getSectionsByCategory(category);
  return sections.find(section => section.id === id) || null;
}

export function getAllSections(): Section[] {
  return Object.values(sectionTemplates).flat();
}

// Legacy functions for backward compatibility
export function registerTemplate(category: string, id: string, template: Section) {
  if (!templates[category]) {
    templates[category] = {};
  }
  templates[category][id] = template;
}

export function getTemplates(category: string): Section[] {
  return Object.values(templates[category] || {});
}

export function getTemplate(category: string, id: string): Section | null {
  return templates[category]?.[id] || null;
}

export function getAllCategories(): string[] {
  return [...sectionCategories];
}

// Template metadata interface
export interface SectionTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  previewImage?: string;
}

// Create metadata for new sections
export const sectionTemplateRegistry: Record<string, Record<string, SectionTemplate>> = {
  hero: {
    "trading-hero": {
      id: "trading-hero",
      name: "Trading Hero",
      description: "Modern trading platform hero with real-time charts and CTAs",
      category: "hero",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Trading+Hero",
    },
    "crypto-hero": {
      id: "crypto-hero",
      name: "Crypto Hero",
      description: "Cryptocurrency trading hero with live market data",
      category: "hero",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Crypto+Hero",
    },
    "investment-hero": {
      id: "investment-hero",
      name: "Investment Hero",
      description: "Professional investment platform hero section",
      category: "hero",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Investment+Hero",
    },
    "modern-hero": {
      id: "modern-hero",
      name: "Modern Hero",
      description: "Clean, modern hero with minimal design",
      category: "hero",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Modern+Hero",
    },
  },
  features: {
    "trading-features": {
      id: "trading-features",
      name: "Trading Features",
      description: "Showcase of trading platform features",
      category: "features",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Trading+Features",
    },
    "security-features": {
      id: "security-features",
      name: "Security Features",
      description: "Platform security highlights",
      category: "features",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Security+Features",
    },
    "platform-features": {
      id: "platform-features",
      name: "Platform Features",
      description: "Core platform capabilities",
      category: "features",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Platform+Features",
    },
  },
  stats: {
    "trading-stats": {
      id: "trading-stats",
      name: "Trading Stats",
      description: "Trading performance statistics",
      category: "stats",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Trading+Stats",
    },
    "performance-stats": {
      id: "performance-stats",
      name: "Performance Stats",
      description: "Platform performance metrics",
      category: "stats",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Performance+Stats",
    },
    "global-stats": {
      id: "global-stats",
      name: "Global Stats",
      description: "Global platform statistics",
      category: "stats",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Global+Stats",
    },
  },
  testimonials: {
    "client-testimonials": {
      id: "client-testimonials",
      name: "Client Testimonials",
      description: "Customer success stories",
      category: "testimonials",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Client+Testimonials",
    },
    "trader-testimonials": {
      id: "trader-testimonials",
      name: "Trader Testimonials",
      description: "Trader success stories",
      category: "testimonials",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Trader+Testimonials",
    },
  },
  pricing: {
    "trading-plans": {
      id: "trading-plans",
      name: "Trading Plans",
      description: "Trading subscription plans",
      category: "pricing",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Trading+Plans",
    },
    "premium-plans": {
      id: "premium-plans",
      name: "Premium Plans",
      description: "Premium subscription options",
      category: "pricing",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Premium+Plans",
    },
  },
  about: {
    "about-company": {
      id: "about-company",
      name: "About Company",
      description: "Company information section",
      category: "about",
      thumbnail: "/placeholder.svg?height=120&width=200&text=About+Company",
    },
    "team-section": {
      id: "team-section",
      name: "Team Section",
      description: "Meet our team section",
      category: "about",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Team+Section",
    },
  },
  contact: {
    "contact-form": {
      id: "contact-form",
      name: "Contact Form",
      description: "Contact form section",
      category: "contact",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Contact+Form",
    },
    "support-center": {
      id: "support-center",
      name: "Support Center",
      description: "Support center section",
      category: "contact",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Support+Center",
    },
  },
  cta: {
    "start-trading": {
      id: "start-trading",
      name: "Start Trading CTA",
      description: "Call to action for trading",
      category: "cta",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Start+Trading",
    },
    "join-platform": {
      id: "join-platform",
      name: "Join Platform CTA",
      description: "Call to action to join platform",
      category: "cta",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Join+Platform",
    },
  },
  news: {
    "market-news": {
      id: "market-news",
      name: "Market News",
      description: "Latest market news section",
      category: "news",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Market+News",
    },
    "platform-updates": {
      id: "platform-updates",
      name: "Platform Updates",
      description: "Latest platform updates",
      category: "news",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Platform+Updates",
    },
  },
  education: {
    "trading-education": {
      id: "trading-education",
      name: "Trading Education",
      description: "Educational content for traders",
      category: "education",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Trading+Education",
    },
    "market-analysis": {
      id: "market-analysis",
      name: "Market Analysis",
      description: "Market analysis and insights",
      category: "education",
      thumbnail: "/placeholder.svg?height=120&width=200&text=Market+Analysis",
    },
  },
};

// Legacy functions for template metadata
export function getTemplatesByCategory(category: string): SectionTemplate[] {
  return Object.values(sectionTemplateRegistry[category] || {});
}

export function getTemplateMetadata(category: string, templateId: string): SectionTemplate | null {
  return sectionTemplateRegistry[category]?.[templateId] || null;
}

export async function loadSectionTemplate(category: string, templateId: string): Promise<Section | null> {
  try {
    const template = getTemplate(category, templateId);
    if (!template) {
      console.warn(`Template not found: ${category}/${templateId}`);
      return null;
    }
    return template;
  } catch (error) {
    console.error(`Error loading section template ${category}/${templateId}:`, error);
    return null;
  }
}

// Export all sections for easy importing
export {
  // Hero sections
  tradingHero,
  cryptoHero,
  investmentHero,
  modernHero,
  
  // Features sections
  tradingFeatures,
  securityFeatures,
  platformFeatures,
  
  // Stats sections
  tradingStats,
  performanceStats,
  globalStats,
  
  // Testimonials sections
  clientTestimonials,
  traderTestimonials,
  
  // Pricing sections
  tradingPlans,
  premiumPlans,
  
  // About sections
  aboutCompany,
  teamSection,
  
  // Contact sections
  contactForm,
  supportCenter,
  
  // CTA sections
  startTrading,
  joinPlatform,
  
  // News sections
  marketNews,
  platformUpdates,
  
  // Education sections
  tradingEducation,
  marketAnalysis
};
