import { useCallback, useMemo } from "react";
import { useConfigStore } from "@/store/config";
import { useShallow } from "zustand/react/shallow";

/** The display surfaces an addon's name can be overridden on. */
export type AddonNameContext = "menu" | "wallet";

/**
 * Default display name per addon, PER SURFACE — and a surface is listed only
 * when the addon actually has one.
 *
 * The shape is the point. This map used to promise every addon both a `menu`
 * and a `wallet` name, so the settings editor offered to rename MailWizard's
 * wallet — a wallet that does not exist. Only three addons introduce a
 * `wallet.type`: the column is an ENUM (`FIAT`, `SPOT`, `ECO`, `FUTURES`,
 * `COPY_TRADING`) so that set is CLOSED and an addon cannot join it without a
 * migration. At the other end, `wallet_connect` and `chart_engine` carry no
 * `extension:` menu item anywhere in config/menu.ts, so they have no name to
 * override at all and get an empty entry rather than two dead inputs.
 *
 * The strings are load-bearing twice over: the editor shows them as
 * placeholders AND treats them as the reset sentinel — typing the default
 * clears the override — so a value that does not match the menu item's English
 * `title` makes the field look broken. Where the admin and user menus title the
 * same extension differently (`forex` is "Forex Broker & Investments" in admin,
 * "Forex Investments" for users) the user-facing title wins, because that is the
 * one an operator is renaming for their customers.
 */
export const ADDON_DISPLAY_DEFAULTS: Record<
  string,
  Partial<Record<AddonNameContext, string>>
> = {
  // Wallet-owning addons — the only three with a `wallet.type` of their own.
  ecosystem: { menu: "Blockchain Ecosystem", wallet: "Ecosystem" },
  futures: { menu: "Futures Trading", wallet: "Futures" },
  copy_trading: { menu: "Copy Trading", wallet: "Copy Trading" },
  // Menu-only addons.
  forex: { menu: "Forex Investments" },
  forex_trading: { menu: "Forex & Stocks" },
  p2p: { menu: "P2P Exchange" },
  trading_bot: { menu: "Algo Trading Bots" },
  hummingbot: { menu: "Hummingbot" },
  ai_market_maker: { menu: "AI Market Maker" },
  binary_ai_engine: { menu: "Binary AI Engine" },
  ai_investment: { menu: "AI Investment" },
  staking: { menu: "Staking Rewards" },
  ico: { menu: "Token Sales" },
  nft: { menu: "NFT Marketplace" },
  ecommerce: { menu: "Store" },
  mlm: { menu: "Affiliate Program" },
  mailwizard: { menu: "Email Marketing" },
  gateway: { menu: "Merchant Gateway" },
  knowledge_base: { menu: "Knowledge Base" },
  // Nothing to rename: no menu item, no wallet type.
  wallet_connect: {},
  chart_engine: {},
};

/**
 * Which contexts an addon can be renamed in.
 *
 * An addon the map has never heard of is assumed to have a menu item and no
 * wallet — new addons ship menu entries, and the wallet ENUM is closed.
 */
export function getAddonNameContexts(addonName: string): AddonNameContext[] {
  const defaults = ADDON_DISPLAY_DEFAULTS[addonName];
  if (!defaults) return ["menu"];
  return (["menu", "wallet"] as const).filter((ctx) => ctx in defaults);
}

// Wallet type to addon name mapping. Mirrors the wallet-owning addons above.
const WALLET_TYPE_ADDON_MAP: Record<string, string> = {
  ECO: "ecosystem",
  FUTURES: "futures",
  COPY_TRADING: "copy_trading",
};

// Alias structure: { "ecosystem": { "menu": "Custom Menu", "wallet": "Custom Wallet" } }
type AddonAliasMap = Record<string, Record<string, string>>;

/** Parse raw addon_aliases from settings into typed structure */
function parseAliases(raw: any): AddonAliasMap {
  if (!raw) return {};
  const str = typeof raw === "string" ? raw : null;
  const obj = typeof raw === "object" ? raw : null;

  if (str) {
    try {
      const parsed = JSON.parse(str);
      // Handle migration from old flat format { "ecosystem": "Name" }
      const result: AddonAliasMap = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") {
          result[key] = { menu: value };
        } else if (typeof value === "object" && value !== null) {
          result[key] = value as Record<string, string>;
        }
      }
      return result;
    } catch {
      return {};
    }
  }

  if (obj) return obj as AddonAliasMap;
  return {};
}

/**
 * Hook to get customized addon display names from settings.
 * Admin can override addon names via System Settings > General > Addon Branding.
 *
 * Each addon supports per-context names:
 * - "menu": Used in sidebar, navigation, mega menu
 * - "wallet": Used in wallet type selectors, deposits, withdrawals
 *
 * Usage:
 *   const { getAddonMenuName, getAddonWalletName, getWalletTypeLabel } = useAddonDisplayName();
 *   const menuName = getAddonMenuName("ecosystem"); // Custom or "Blockchain Ecosystem"
 *   const walletName = getAddonWalletName("ecosystem"); // Custom or "Ecosystem"
 *   const walletLabel = getWalletTypeLabel("ECO"); // Resolves ECO -> ecosystem -> wallet name
 */
export function useAddonDisplayName() {
  const settings = useConfigStore(useShallow((state) => state.settings));

  const aliases: AddonAliasMap = useMemo(
    () => parseAliases(settings?.addon_aliases),
    [settings?.addon_aliases]
  );

  /** Get the menu display name for an addon (sidebar, navigation). */
  const getAddonMenuName = useCallback(
    (addonName: string, fallback?: string): string => {
      const custom = aliases[addonName]?.menu;
      if (custom) return custom;
      return fallback || ADDON_DISPLAY_DEFAULTS[addonName]?.menu || addonName;
    },
    [aliases]
  );

  /** Get the wallet display name for an addon (wallet selectors, deposits). */
  const getAddonWalletName = useCallback(
    (addonName: string, fallback?: string): string => {
      const custom = aliases[addonName]?.wallet;
      if (custom) return custom;
      return fallback || ADDON_DISPLAY_DEFAULTS[addonName]?.wallet || addonName;
    },
    [aliases]
  );

  /** Get a display name for an addon in any context. */
  const getAddonDisplayName = useCallback(
    (addonName: string, context: string = "menu", fallback?: string): string => {
      const custom = aliases[addonName]?.[context];
      if (custom) return custom;
      const defaults = ADDON_DISPLAY_DEFAULTS[addonName];
      if (defaults && context in defaults) {
        return defaults[context as AddonNameContext]!;
      }
      return fallback || addonName;
    },
    [aliases]
  );

  /**
   * Get a display label for a wallet type, resolving via addon aliases.
   * Maps wallet type codes (ECO, FUTURES) to addon names, then returns
   * the wallet-context alias.
   */
  const getWalletTypeLabel = useCallback(
    (walletType: string, fallback?: string): string => {
      const addonName = WALLET_TYPE_ADDON_MAP[walletType];
      if (addonName) {
        const custom = aliases[addonName]?.wallet;
        if (custom) return custom;
      }
      return fallback || walletType;
    },
    [aliases]
  );

  return {
    aliases,
    getAddonMenuName,
    getAddonWalletName,
    getAddonDisplayName,
    getWalletTypeLabel,
  };
}

/**
 * Non-hook utility to get addon aliases from the config store directly.
 * Use this in non-component contexts (e.g., menu config functions).
 */
export function getAddonAliasesFromStore(): AddonAliasMap {
  const settings = useConfigStore.getState().settings;
  return parseAliases(settings?.addon_aliases);
}

/** Non-hook utility to get addon menu name from store. */
export function getAddonMenuNameFromStore(
  addonName: string,
  fallback?: string
): string {
  const aliases = getAddonAliasesFromStore();
  const custom = aliases[addonName]?.menu;
  if (custom) return custom;
  return fallback || ADDON_DISPLAY_DEFAULTS[addonName]?.menu || addonName;
}

/** Non-hook utility to get addon wallet name from store. */
export function getAddonWalletNameFromStore(
  addonName: string,
  fallback?: string
): string {
  const aliases = getAddonAliasesFromStore();
  const custom = aliases[addonName]?.wallet;
  if (custom) return custom;
  return fallback || ADDON_DISPLAY_DEFAULTS[addonName]?.wallet || addonName;
}
