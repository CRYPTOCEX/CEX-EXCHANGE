/**
 * GENERATED FILE - DO NOT EDIT.
 * ============================================================================
 *
 * Every extension menu the admin menu editor can edit. Generated from the
 * `menu.ts` files under `app/[locale]/(ext)/`, because nothing else in the
 * app enumerates them and a hand-written list goes stale silently — a new
 * extension's menu would simply not be editable, with nothing to say why.
 *
 * Regenerate:  npm run build:addon-menus
 * Drift gate:  npm run check:addon-menus
 *
 * Scope strings are NOT baked in here. They are derived by `menuScopeFor` in
 * config/menu.ts so the editor and the renderer cannot disagree about them —
 * a mismatched scope makes an edit save successfully and do nothing.
 */

import type { MenuNodeLike } from "@/lib/chrome/menu-overrides";

import { menu as menu0 } from "@/app/[locale]/(ext)/affiliate/menu";
import { menu as menu1 } from "@/app/[locale]/(ext)/admin/affiliate/menu";
import { menu as menu2 } from "@/app/[locale]/(ext)/admin/ai/binary-engine/menu";
import { menu as menu3 } from "@/app/[locale]/(ext)/admin/ai/investment/menu";
import { menu as menu4 } from "@/app/[locale]/(ext)/admin/ai/market-maker/menu";
import { menu as menu5 } from "@/app/[locale]/(ext)/admin/ai/support/menu";
import { menu as menu6 } from "@/app/[locale]/(ext)/copy-trading/menu";
import { menu as menu7 } from "@/app/[locale]/(ext)/admin/copy-trading/menu";
import { menu as menu8 } from "@/app/[locale]/(ext)/dex/menu";
import { menu as menu9 } from "@/app/[locale]/(ext)/admin/dex/menu";
import { menu as menu10 } from "@/app/[locale]/(ext)/ecommerce/menu";
import { menu as menu11 } from "@/app/[locale]/(ext)/admin/ecommerce/menu";
import { menu as menu12 } from "@/app/[locale]/(ext)/admin/ecosystem/menu";
import { menu as menu13 } from "@/app/[locale]/(ext)/faq/menu";
import { menu as menu14 } from "@/app/[locale]/(ext)/admin/faq/menu";
import { menu as menu15 } from "@/app/[locale]/(ext)/forex-trading/menu";
import { menu as menu16 } from "@/app/[locale]/(ext)/admin/forex-trading/menu";
import { menu as menu17 } from "@/app/[locale]/(ext)/forex/menu";
import { menu as menu18 } from "@/app/[locale]/(ext)/admin/forex/menu";
import { menu as menu19 } from "@/app/[locale]/(ext)/admin/futures/menu";
import { menu as menu20 } from "@/app/[locale]/(ext)/gateway/menu";
import { menu as menu21 } from "@/app/[locale]/(ext)/admin/gateway/menu";
import { menu as menu22 } from "@/app/[locale]/(ext)/hb/menu";
import { menu as menu23 } from "@/app/[locale]/(ext)/admin/hb/menu";
import { menu as menu24 } from "@/app/[locale]/(ext)/ico/menu";
import { menu as menu25 } from "@/app/[locale]/(ext)/admin/ico/menu";
import { menu as menu26 } from "@/app/[locale]/(ext)/admin/mailwizard/menu";
import { menu as menu27 } from "@/app/[locale]/(ext)/nft/menu";
import { menu as menu28 } from "@/app/[locale]/(ext)/admin/nft/menu";
import { menu as menu29 } from "@/app/[locale]/(ext)/p2p/menu";
import { menu as menu30 } from "@/app/[locale]/(ext)/admin/p2p/menu";
import { menu as menu31 } from "@/app/[locale]/(ext)/staking/menu";
import { menu as menu32 } from "@/app/[locale]/(ext)/admin/staking/menu";
import { menu as menu33 } from "@/app/[locale]/(ext)/trading-bot/menu";
import { menu as menu34 } from "@/app/[locale]/(ext)/admin/trading-bot/menu";

export interface AddonMenuEntry {
  /** Extension id, e.g. `staking` or `ai/market-maker`. */
  id: string;
  /** True for the extension's ADMIN menu, false for its public one. */
  isAdmin: boolean;
  items: MenuNodeLike[];
}

export const ADDON_MENUS: readonly AddonMenuEntry[] = Object.freeze([
  { id: "affiliate", isAdmin: false, items: menu0 as MenuNodeLike[] },
  { id: "affiliate", isAdmin: true, items: menu1 as MenuNodeLike[] },
  { id: "ai/binary-engine", isAdmin: true, items: menu2 as MenuNodeLike[] },
  { id: "ai/investment", isAdmin: true, items: menu3 as MenuNodeLike[] },
  { id: "ai/market-maker", isAdmin: true, items: menu4 as MenuNodeLike[] },
  { id: "ai/support", isAdmin: true, items: menu5 as MenuNodeLike[] },
  { id: "copy-trading", isAdmin: false, items: menu6 as MenuNodeLike[] },
  { id: "copy-trading", isAdmin: true, items: menu7 as MenuNodeLike[] },
  { id: "dex", isAdmin: false, items: menu8 as MenuNodeLike[] },
  { id: "dex", isAdmin: true, items: menu9 as MenuNodeLike[] },
  { id: "ecommerce", isAdmin: false, items: menu10 as MenuNodeLike[] },
  { id: "ecommerce", isAdmin: true, items: menu11 as MenuNodeLike[] },
  { id: "ecosystem", isAdmin: true, items: menu12 as MenuNodeLike[] },
  { id: "faq", isAdmin: false, items: menu13 as MenuNodeLike[] },
  { id: "faq", isAdmin: true, items: menu14 as MenuNodeLike[] },
  { id: "forex-trading", isAdmin: false, items: menu15 as MenuNodeLike[] },
  { id: "forex-trading", isAdmin: true, items: menu16 as MenuNodeLike[] },
  { id: "forex", isAdmin: false, items: menu17 as MenuNodeLike[] },
  { id: "forex", isAdmin: true, items: menu18 as MenuNodeLike[] },
  { id: "futures", isAdmin: true, items: menu19 as MenuNodeLike[] },
  { id: "gateway", isAdmin: false, items: menu20 as MenuNodeLike[] },
  { id: "gateway", isAdmin: true, items: menu21 as MenuNodeLike[] },
  { id: "hb", isAdmin: false, items: menu22 as MenuNodeLike[] },
  { id: "hb", isAdmin: true, items: menu23 as MenuNodeLike[] },
  { id: "ico", isAdmin: false, items: menu24 as MenuNodeLike[] },
  { id: "ico", isAdmin: true, items: menu25 as MenuNodeLike[] },
  { id: "mailwizard", isAdmin: true, items: menu26 as MenuNodeLike[] },
  { id: "nft", isAdmin: false, items: menu27 as MenuNodeLike[] },
  { id: "nft", isAdmin: true, items: menu28 as MenuNodeLike[] },
  { id: "p2p", isAdmin: false, items: menu29 as MenuNodeLike[] },
  { id: "p2p", isAdmin: true, items: menu30 as MenuNodeLike[] },
  { id: "staking", isAdmin: false, items: menu31 as MenuNodeLike[] },
  { id: "staking", isAdmin: true, items: menu32 as MenuNodeLike[] },
  { id: "trading-bot", isAdmin: false, items: menu33 as MenuNodeLike[] },
  { id: "trading-bot", isAdmin: true, items: menu34 as MenuNodeLike[] },
]);

export default ADDON_MENUS;
