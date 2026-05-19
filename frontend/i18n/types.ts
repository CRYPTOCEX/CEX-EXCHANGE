/**
 * Custom Translation System - Type Definitions
 *
 * This is a lightweight, build-optimized translation system that:
 * 1. Only loads namespaces that are actually used on each page
 * 2. Supports interpolation with {variable} syntax
 * 3. Works with both Server and Client Components
 * 4. Has zero runtime overhead for static translations
 */

// All available namespace names (derived from messages/en/*.json files)
export type Namespace =
  | "admin"
  | "binary_components"
  | "blog"
  | "blog_admin"
  | "blog_blog"
  | "common"
  | "components"
  | "components_auth"
  | "components_blocks"
  | "dashboard"
  | "dashboard_admin"
  | "dashboard_user"
  | "ext"
  | "ext_admin"
  | "ext_admin_affiliate"
  | "ext_admin_ai_investment"
  | "ext_admin_ai_market-maker"
  | "ext_admin_copy-trading"
  | "ext_admin_ecommerce"
  | "ext_admin_ecosystem"
  | "ext_admin_faq"
  | "ext_admin_forex"
  | "ext_admin_futures"
  | "ext_admin_gateway"
  | "ext_admin_ico"
  | "ext_admin_mailwizard"
  | "ext_admin_nft"
  | "ext_admin_p2p"
  | "ext_admin_staking"
  | "ext_affiliate"
  | "ext_copy-trading"
  | "ext_ecommerce"
  | "ext_faq"
  | "ext_forex"
  | "ext_gateway"
  | "ext_ico"
  | "ext_nft"
  | "ext_p2p"
  | "ext_staking"
  | "finance"
  | "finance_history"
  | "finance_wallet"
  | "investment"
  | "menu"
  | "support_ticket"
  | "trade"
  | "trade_components"
  | "utility_api-docs";

// Translation messages structure (non-circular definition)
export interface TranslationMessages {
  [key: string]: string | TranslationMessages;
}

// Namespace messages map
export type NamespaceMessages = Record<Namespace, TranslationMessages>;

// Partial namespace messages (for loading specific namespaces)
export type PartialNamespaceMessages = Partial<NamespaceMessages>;

// Translation function type
export type TranslationFunction = (
  key: string,
  params?: Record<string, string | number>
) => string;

// Context value type
export interface TranslationContextValue {
  locale: string;
  messages: PartialNamespaceMessages;
  t: (namespace: Namespace) => TranslationFunction;
}

// Provider props
export interface TranslationProviderProps {
  locale: string;
  messages: PartialNamespaceMessages;
  children: React.ReactNode;
}

// Supported locales (loaded from environment)
export type SupportedLocale = string;

// Translation config
export interface TranslationConfig {
  defaultLocale: string;
  locales: string[];
  defaultNamespaces: Namespace[];
}

// Rich text components for formatted translations
export type RichTextComponents = Record<
  string,
  (chunks: React.ReactNode) => React.ReactNode
>;
