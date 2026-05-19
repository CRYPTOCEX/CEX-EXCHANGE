// ============================================================================
// SECTIONS - Premium Landing Page Components
// ============================================================================

// Hero Section
export * from "./hero";

// Features Section
export * from "./features";

// Testimonials Section
export * from "./testimonials";

// Pricing Section
export * from "./pricing";

// CTA Section
export * from "./cta";

// Stats Section
export * from "./stats";

// Process Section (How It Works)
export * from "./process";

// FAQ Section
export * from "./faq";

// Trust Section
export * from "./trust";

// Shared Components (excluding types that may conflict with section-specific types)
export { SectionBackground, SectionHeader, InteractivePattern, FloatingShapes } from "./shared";
export type { PatternConfig } from "./shared";
