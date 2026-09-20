/**
 * Custom Translation System - Type Definitions
 *
 * This is a lightweight, build-optimized translation system that:
 * 1. Only loads namespaces that are actually used on each page
 * 2. Supports interpolation with {variable} syntax
 * 3. Works with both Server and Client Components
 * 4. Has zero runtime overhead for static translations
 */

/**
 * All available namespace names.
 *
 * HAND-MAINTAINED, despite mirroring the top-level keys of `messages/en.json`.
 * Nothing generates or checks it, so it drifts silently: a namespace can sit in
 * en.json for as long as no page asks for it, and the omission only surfaces
 * the day one does — `ext_admin_ai_binary-engine` and `ext_admin_hb` were both
 * already in en.json and both missing here until the first page called them.
 *
 * The dash matters. A namespace mirrors its route folder with `/` -> `_`, so
 * the folder's own dash survives: `ai/market-maker` is
 * `ext_admin_ai_market-maker`, never `ext_admin_ai_market_maker`. This union is
 * what enforces that — an underscored variant fails to compile rather than
 * quietly forking the addon's strings into a second namespace that the
 * translation manager would then propagate to all 90 locales separately.
 *
 * When adding a namespace to en.json, add it here in the same commit.
 */
export type Namespace =
  | "admin"
  | "binary_components"
  | "blog"
  | "blog_admin"
  | "blog_blog"
  | "common"
  | "components"
  | "components_auth"
  | "components_binary"
  | "components_blocks"
  | "dashboard"
  | "dashboard_admin"
  | "dashboard_user"
  | "ext"
  | "ext_admin"
  | "ext_admin_affiliate"
  | "ext_admin_ai"
  | "ext_admin_ai_binary-engine"
  | "ext_admin_ai_investment"
  | "ext_admin_ai_market-maker"
  | "ext_admin_ai_support"
  | "ext_admin_copy-trading"
  | "ext_admin_dex"
  | "ext_admin_ecommerce"
  | "ext_admin_ecosystem"
  | "ext_admin_faq"
  | "ext_admin_forex"
  | "ext_admin_forex-trading"
  | "ext_admin_futures"
  | "ext_admin_gateway"
  | "ext_admin_hb"
  | "ext_admin_ico"
  | "ext_admin_mailwizard"
  | "ext_admin_nft"
  | "ext_admin_p2p"
  | "ext_admin_staking"
  | "ext_admin_trading-bot"
  | "ext_affiliate"
  | "ext_copy-trading"
  | "ext_dex"
  | "ext_ecommerce"
  | "ext_faq"
  | "ext_forex"
  | "ext_forex-trading"
  | "ext_gateway"
  | "ext_hb"
  | "ext_ico"
  | "ext_nft"
  | "ext_p2p"
  | "ext_staking"
  | "ext_trading-bot"
  | "finance"
  | "finance_history"
  | "finance_wallet"
  | "investment"
  | "menu"
  /*
   * The AI assistant's CATALOGUE — guide stops, workflow steps, offered actions.
   *
   * Separate from `support_ticket`, which is the chrome around them ("Step 1 of
   * 4", "Show me how"). These are the payload the backend catalogue supplies,
   * they are rendered on three surfaces that are mounted in the locale layout
   * rather than on one page, and their keys are harvested off the backend rather
   * than extracted from `t()` calls. Mixing them into the ticket's namespace
   * would put a walkthrough's text behind a page nobody is on.
   */
  | "support_assistant"
  | "support_ticket"
  | "trade"
  | "trade_components"
  | "trade_pro"
  | "utility_api-docs"
  | "utility_restricted"
  | "utility_api-docs";

// Translation messages structure (non-circular definition)
export interface TranslationMessages {
  [key: string]: string | TranslationMessages;
}

// Namespace messages map
export type NamespaceMessages = Record<Namespace, TranslationMessages>;

// Partial namespace messages (for loading specific namespaces)
export type PartialNamespaceMessages = Partial<NamespaceMessages>;

/**
 * The property a generated chunk — and a loaded message set — carries its own
 * provenance under.
 *
 * `"__meta"` is deliberately NOT a member of `Namespace`, so `t(namespace)` can
 * never reach it and no locale file can collide with it. It is a string const
 * rather than a symbol because it has to survive `JSON.stringify` on the way
 * out of the generator and the RSC payload on the way to the browser.
 */
export const META_KEY = "__meta";

/**
 * What a chunk knows about itself.
 *
 * `v`      the build stamp shared by one generation run. Chunk requests carry
 *          it as `?v=`, so a browser-cached chunk from the previous release
 *          cannot shadow this one's.
 * `keys`   the leaf count the generator wrote. The runtime refuses a chunk that
 *          cannot show at least this many — see `isChunkUsable` in loader.ts.
 * `core`   true when the payload is the shared core set (so a route remainder
 *          is still outstanding); false when it is the whole catalogue and
 *          nothing needs topping up.
 * `routes` which route patterns this message set already covers, so a client
 *          that merges route chunks as the user navigates does not re-fetch one
 *          it already has.
 * `menu`   on a route chunk, which menu chunk goes with it.
 */
export interface I18nMessagesMeta {
  v: string;
  keys?: number;
  core?: boolean;
  routes?: string[];
  menu?: string | null;
}

/**
 * Messages plus their provenance. This is what the loaders return and what the
 * `[locale]` layout hands to `TranslationProvider`.
 */
export type MessagesWithMeta = PartialNamespaceMessages & {
  [META_KEY]?: I18nMessagesMeta;
};

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
