#!/usr/bin/env node
/**
 * Remove files a previous version left behind.
 * ============================================================================
 *
 * An update is extracted OVER the existing install. Files the release CHANGED
 * are overwritten and files it ADDED appear, but files it REMOVED are still
 * sitting there afterwards — nothing in the pipeline deletes anything. That is
 * usually harmless dead weight.
 *
 * It stops being harmless when the removed file has the same name as a
 * directory beside it. `components/ui/chart.tsx` was replaced by the
 * `components/ui/chart/` kit, and module resolution prefers the FILE, so on
 * every updated install `@/components/ui/chart` bound to the deleted module and
 * the build died with:
 *
 *     The export seriesColor was not found in module .../components/ui/chart.tsx
 *
 * pointing at a file that is not in the product any more — which is why it cost
 * a day rather than a minute. `next.config.js` now pins those barrels so the
 * build survives regardless, but the file still has to go: tsc, ESLint and the
 * editor all resolve it the old way and none of them read the Next config.
 *
 * The app router makes it worse than dead weight. Every `page.tsx` under
 * `frontend/app` IS a route, so a page a release deleted keeps building — and
 * keeps failing — on an updated install:
 *
 *     Export redirect doesn't exist in target module
 *       app/[locale]/.../notification/template/[id]/edit/page.tsx
 *
 * That file was removed in Dec 2025 along with the rest of `template/[id]/`.
 * The copy that broke the build was OLDER still: it imported a `redirect` that
 * `i18n/routing` stopped exporting long before. A leftover is whatever version
 * the install last shipped, not the version the repo deleted, so there is no
 * way to predict which import will break — the directory has to go entirely.
 *
 * Three passes, because none alone is enough:
 *
 *   1. RETIRED — an explicit list of paths this product has removed. Precise,
 *      and the only way to catch leftovers that shadow nothing.
 *   2. RETIRED_DIRS — directories a release removed, deleted whole. A route
 *      folder can hold files from any past version; listing them one by one
 *      only retires the ones we happen to know about.
 *   3. SHADOW — anything that resolves ahead of a sibling index barrel. Catches
 *      what nobody remembered to add to the list, which is the usual case.
 *
 * And then one pass that puts files BACK, which is the important one:
 *
 *   4. REFERENCED — never delete a module something still on disk imports.
 *
 * Every pass above assumes the leftover is unreachable: the release that
 * removed it also rewrote whoever imported it, so by the time we run, nothing
 * points at it. That assumption is the whole basis for deleting anything, and
 * it holds only if the update landed COMPLETELY.
 *
 * When it lands partially it inverts, and the script stops being a repair and
 * becomes the outage. A release rebuilt the P2P section: `p2p/dashboard/page.tsx`
 * became a redirect stub, `p2p/dashboard/client.tsx` was deleted and listed
 * below. One install received the new `scripts/` but kept the old
 * `frontend/app/[locale]/(ext)/p2p/`, so this script ran with a current list
 * against a previous tree — deleted the client, left a page.tsx that still
 * imported it, and the build died 21 times over:
 *
 *     Module not found: Can't resolve './client'
 *       app/[locale]/(ext)/p2p/dashboard/page.tsx:2:1
 *
 * Every one of those 21 named a path from the lists below. Before the script
 * ran, that install built and served fine on last release's P2P section; after
 * it, nothing built at all. A leftover nobody imports is dead weight, but a
 * leftover something DOES import is load-bearing, and which one it is depends
 * on the state of the install rather than on anything we can know from here.
 *
 * So pass 4 reads every source file under frontend/ and backend/, resolves the
 * specifiers it names, and drops any target something still points at — with
 * two rules that matter:
 *
 *   - An importer that is ITSELF being deleted does not count. Retired files
 *     reference each other constantly (`offer/client.tsx` imported
 *     `offer/columns.tsx`, both retired), and honouring that would pin every
 *     cluster in place permanently. Fixed-point, so un-deleting a folder lets
 *     its contents speak in the next round.
 *   - A file that SHADOWS a same-named directory is never protected. Those are
 *     the case the script was written for: `@/components/ui/chart` resolves to
 *     `chart.tsx` ahead of `chart/index.ts` precisely BECAUSE the file is still
 *     there, so the ~200 live importers of that specifier would otherwise vote
 *     to keep the very file that is breaking them. Same for `backend/dist/types.js`.
 *
 * A kept path is reported, not silenced. Something still importing a module
 * this release removed means that importer is an OLD COPY, so the report names
 * it: those are the files an incomplete update failed to overwrite, and
 * re-extracting over them is the actual fix.
 *
 *   Preview:  pnpm clean:stale --check
 *   Gate:     pnpm clean:stale:check          (--check-strict, exits 1 on findings)
 *   Apply:    pnpm clean:stale
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* --check         preview, always exit 0 (the historical behaviour, unchanged).
   --check-strict  preview, exit 1 when anything WOULD be removed. This is the
                   gate form, used by `pnpm gate`. `--check` alone can never
                   fail, and several documents wrongly treated it as a gate.

   Note the shape of APPLY: --check-strict does NOT contain the substring test
   `argv.includes("--check")` uses, so without naming it here explicitly the
   strict flag would leave APPLY true and DELETE the files it was asked to
   merely report. */
const STRICT = process.argv.includes("--check-strict");
const APPLY = !process.argv.includes("--check") && !STRICT;

/**
 * Paths removed by a release, repo-relative.
 *
 * ADD TO THIS when a release deletes a file that an old install would keep
 * resolving — anything a still-shipping specifier could bind to. Entries are
 * safe to leave here forever; a path that no longer exists is skipped.
 */
const RETIRED = [
  // Replaced by the `components/ui/chart/` kit (ChartCard, SeriesChart,
  // DonutChart, seriesColor, ...). The old shadcn wrapper exported none of it.
  "frontend/components/ui/chart.tsx",
  // Replaced by `analytics/charts/` (line, bar, donut, stacked-bar, area).
  "frontend/components/blocks/data-table/analytics/charts.tsx",
  // Replaced by the compiled `backend/dist/types/` directory.
  "backend/dist/types.js",

  // Test-runner configs superseded by the top-level e2e/ package. Left behind by
  // an update they are worse than clutter: a stray `backend/jest.config.js` is
  // what a bare `jest` in that directory picks up, so an operator can run a
  // green suite from a config that points at directories which no longer exist.
  // The root jest.config.js was already dead - jest is not installed there.
  "jest.config.js",
  "backend/jest.config.js",
  "frontend/vitest.config.ts",
  "frontend/vitest.setup.ts",

  // Route files removed from folders the product still ships. The folder stays,
  // so RETIRED_DIRS never reaches them, and each one is a live route for the
  // app router until it is deleted. `(ext)/forex/loading.tsx` is the proven
  // one — it imports `(ext)/theme-config`, which no longer exists at all.
  "frontend/app/error.tsx",
  "frontend/app/[locale]/(blog)/admin/blog/loading.tsx",
  "frontend/app/[locale]/(dashboard)/admin/crm/kyc/application/[id]/loading.tsx",
  "frontend/app/[locale]/(dashboard)/admin/crm/kyc/application/[id]/permission.ts",
  "frontend/app/[locale]/(dashboard)/admin/default-editor/layout.tsx",
  "frontend/app/[locale]/(dashboard)/admin/system/notification/template/columns.tsx",
  // The LAYOUT only. `user/page.tsx` was on this list and came BACK: `/user`
  // now ships a real landing (the PWA shortcut in public/manifest.json and
  // dynamic-menu's `normalizedPath === "/user"` branch both pointed at a route
  // that 404'd). Leaving it listed would delete that page on every updated
  // install and re-open the same hole, so it is gone from here. The layout
  // stays retired because the new page deliberately does NOT add one - see its
  // header: a `user/layout.tsx` would nest above `user/kyc/layout.tsx` and give
  // that screen two headers.
  "frontend/app/[locale]/(dashboard)/user/layout.tsx",
  "frontend/app/[locale]/(ext)/admin/ico/offer/layout.tsx",
  "frontend/app/[locale]/(ext)/admin/ico/offer/loading.tsx",
  "frontend/app/[locale]/(ext)/admin/nft/loading.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/offer/[id]/edit/permission.ts",
  "frontend/app/[locale]/(ext)/admin/p2p/offer/[id]/permission.ts",
  "frontend/app/[locale]/(ext)/admin/staking/(overview)/loading.tsx",
  "frontend/app/[locale]/(ext)/admin/staking/pool/loading.tsx",
  "frontend/app/[locale]/(ext)/admin/staking/position/loading.tsx",
  "frontend/app/[locale]/(ext)/admin/staking/settings/loading.tsx",
  "frontend/app/[locale]/(ext)/ecommerce/loading.tsx",
  "frontend/app/[locale]/(ext)/ecommerce/order/loading.tsx",
  "frontend/app/[locale]/(ext)/faq/loading.tsx",
  "frontend/app/[locale]/(ext)/forex/investment/loading.tsx",
  "frontend/app/[locale]/(ext)/forex/loading.tsx",
  "frontend/app/[locale]/(ext)/forex/transaction/loading.tsx",
  "frontend/app/[locale]/(ext)/ico/loading.tsx",
  "frontend/app/[locale]/(ext)/ico/transaction/loading.tsx",
  "frontend/app/[locale]/(ext)/p2p/loading.tsx",
  "frontend/app/[locale]/(ext)/staking/guide/layout.tsx",
  "frontend/app/[locale]/(ext)/staking/loading.tsx",

  // The P2P settings page's Market Filter Style picker. The guided/classic
  // choice moved to the reader — /p2p/market carries the switch and remembers it
  // per browser — so the admin field and its custom renderer are both gone.
  // `settings.ts` no longer imports this, and a leftover copy on an updated
  // install is a live module in a folder the product still ships.
  "frontend/app/[locale]/(ext)/admin/p2p/settings/components/MarketFilterStyle.tsx",

  // ---- P2P rework ---------------------------------------------------------
  // Route files in folders that survive. Each of these is a live route (or a
  // module a surviving route would still resolve) on an install that updated
  // over the old version.
  //
  // The landing page's five data sections became ONE live board, so the folder
  // stays but its old occupants must go — section-empty.tsx in particular was
  // the shared empty state they all rendered.
  "frontend/app/[locale]/(ext)/p2p/components/landing/featured-offers-section.tsx",
  "frontend/app/[locale]/(ext)/p2p/components/landing/live-activity-section.tsx",
  "frontend/app/[locale]/(ext)/p2p/components/landing/payment-methods-section.tsx",
  "frontend/app/[locale]/(ext)/p2p/components/landing/section-empty.tsx",
  "frontend/app/[locale]/(ext)/p2p/components/landing/top-cryptos-section.tsx",
  "frontend/app/[locale]/(ext)/p2p/components/landing/top-traders-section.tsx",
  // Folded into redirect stubs; the page.tsx beside each of these is the stub.
  "frontend/app/[locale]/(ext)/p2p/dashboard/client.tsx",
  "frontend/app/[locale]/(ext)/p2p/dashboard/error-state.tsx",
  "frontend/app/[locale]/(ext)/p2p/dashboard/loading.tsx",
  "frontend/app/[locale]/(ext)/p2p/guided-matching/client.tsx",
  "frontend/app/[locale]/(ext)/p2p/guided-matching/loading.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/client.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/columns.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/loading.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/create/client.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/create/loading.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/client.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/loading.tsx",
  // The offer permalink was rebuilt; its components/ folder survives with new
  // occupants, so the old ones are individually retired. `trade-form.tsx` is
  // the one that matters most — it read `settings.p2pEnabled` raw, and settings
  // are TEXT, so a stored "false" was truthy there.
  "frontend/app/[locale]/(ext)/p2p/offer/[id]/components/error-state.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/[id]/components/loading-state.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/[id]/components/offer-details-tabs.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/[id]/components/offer-hero.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/[id]/components/payment-method-icon.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/[id]/components/seller-information.tsx",
  "frontend/app/[locale]/(ext)/p2p/offer/[id]/components/trade-form.tsx",
  // The tabbed trade room. components/ survives (room/, dispute-dialog, the
  // wrapper), so these fourteen go individually.
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-actions.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-alerts.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-chat.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-details-tab.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-details.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-escrow.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-header.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-info.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-payment.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-progress.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-rating.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-status-badge.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-timeline.tsx",
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/trade-timer.tsx",
  // Fifteenth, and the one with teeth. `components/` is a real route segment to
  // the app router (only `_`-prefixed folders are private), and `not-found.tsx`
  // is a SPECIAL FILE there, so Next compiles it as the not-found boundary for
  // that subtree whether or not anything imports it — which nothing did. Its
  // body was pre-rework too: a `pt-20` clearance hardcoded inside a shell that
  // already clears the header, and a button to `/p2p/trade`, now a redirect stub
  // to `/p2p/trades`. The wrapper's own not-found branch replaced it.
  "frontend/app/[locale]/(ext)/p2p/trade/[id]/components/not-found.tsx",

  // ---- 6.6.2 -------------------------------------------------------------

  // THE ONE THAT MATTERS. `GET /api/auth/login/chat` took an email, a password
  // and a name from the query string and returned a live session on a new,
  // email-verified account — no sign-in, no captcha, and outside the rate
  // limiter because it was a GET. 6.6.2 removes it and the release note tells
  // operators it is gone. An update extracts OVER an install and deletes
  // nothing, so without these two lines the compiled handler stays on disk, the
  // route loader goes on registering it, and the hole is open on every UPDATED
  // install while being closed on every fresh one.
  "backend/src/api/auth/login/chat.get.ts",
  "backend/dist/src/api/auth/login/chat.get.js",

  // cTrader was withdrawn as a forex provider. Same mechanism as above: a
  // leftover compiled route is a live route. The two `ctrader-oauth` folders and
  // the admin callback page are whole directories, so they are in RETIRED_DIRS.
  "backend/src/api/(ext)/forex-trading/utils/engine/bridges/ctrader.ts",
  "backend/src/api/(ext)/forex-trading/utils/providers/ctrader-oauth.ts",
  "backend/src/api/(ext)/forex-trading/utils/providers/ctrader.ts",
  "backend/dist/src/api/(ext)/forex-trading/utils/engine/bridges/ctrader.js",
  "backend/dist/src/api/(ext)/forex-trading/utils/providers/ctrader-oauth.js",
  "backend/dist/src/api/(ext)/forex-trading/utils/providers/ctrader.js",

  // The investment rebuild: the dashboard and the history table became one
  // `My investments` page, and both old routes are redirect stubs now. Their
  // `page.tsx` still exists and no longer imports `./client`, so a stale client
  // is dead weight rather than load-bearing — but `navbar.tsx` was the section's
  // own nav bar, which the rebuild dropped entirely.
  "frontend/app/[locale]/investment/dashboard/client.tsx",
  "frontend/app/[locale]/investment/history/client.tsx",
  "frontend/app/[locale]/investment/history/columns.tsx",
  "frontend/app/[locale]/investment/navbar.tsx",

  // `/support/ticket` merged into `/support`. The redirect is declared in
  // next.config.js, which is matched ahead of the filesystem, so a leftover page
  // here is shadowed rather than served — it is listed to keep the tree clean,
  // not because it is dangerous. `ticket/[id]` still ships and stays.
  "frontend/app/[locale]/support/ticket/page.tsx",
  "frontend/app/[locale]/support/ticket/loading.tsx",

  // The admin P2P case rework replaced the dispute screen's component set. The
  // folder still ships four files, so this is a file list rather than a folder.
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/action-message.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/admin-notes.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/back-button.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/dispute-breadcrumb.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/dispute-header.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/dispute-status-badge.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/dispute-tabs.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/error-display.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/evidence-tab.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/loading-skeleton.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/overview-tab.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/priority-badge.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/resolution-details.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/resolution-form.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/timeline-tab.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/dispute/[id]/components/user-history.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/components/admin-chat-tab.tsx",
  "frontend/app/[locale]/(ext)/admin/p2p/trade/[id]/components/trade-timeline-view.tsx",

  // The binary engine's admin page dropped its separate mobile components; the
  // one layout is responsive now. `index.ts` was their barrel.
  "frontend/app/[locale]/(ext)/admin/ai/binary-engine/components/MobileAlertBanner.tsx",
  "frontend/app/[locale]/(ext)/admin/ai/binary-engine/components/MobileEngineCard.tsx",
  "frontend/app/[locale]/(ext)/admin/ai/binary-engine/components/MobileQuickActions.tsx",
  "frontend/app/[locale]/(ext)/admin/ai/binary-engine/components/index.ts",

  // Moved, not deleted — but the OLD path is what an install keeps, and both of
  // these are barrel-adjacent names that a stale importer would still resolve.
  "frontend/app/[locale]/(ext)/admin/dex/chain/address-cell.tsx",
  "frontend/app/[locale]/(ext)/p2p/trades/components/fiat-amount.tsx",

  // Folded into the P2P trades rework.
  "frontend/app/[locale]/(ext)/p2p/trades/components/my-offers-list.tsx",
  "frontend/app/[locale]/(ext)/p2p/trades/components/section-switch.tsx",

  // The page-heading rework removed per-page heading animation entirely, and
  // 6.6.2 makes passing one a BUILD ERROR rather than a silent no-op — so a
  // leftover copy of the module those settings came from is exactly the file a
  // half-updated fork would still resolve.
  "frontend/components/blocks/data-table/header/design-animations.tsx",

  // Proof-of-work is one captcha provider among five now, and the browser-side
  // solver moved. The old hook name is still what an old client imports.
  "frontend/hooks/use-pow-captcha.ts",

  // Raw API dumps left at the backend root while the DEX token work was being
  // built — Jupiter's Solana token list, CoinGecko's coin list, CoinPaprika's,
  // the Uniswap Labs default list, one CoinGecko search response and a stray
  // image. Nothing reads them: the token importer fetches a URL the operator
  // gives it, never a local file. They are only 16.4 MB of dead weight, but
  // they were COMMITTED, so they shipped, and an update deletes nothing — every
  // install that ever received them keeps carrying them until this list does.
  "backend/jup.json",
  "backend/cg.json",
  "backend/cp.json",
  "backend/uni.json",
  "backend/g.json",
  "backend/t.png",
];

/**
 * Directories removed by a release, repo-relative. Deleted RECURSIVELY.
 *
 * ADD TO THIS when a release removes a route folder. Only list a folder the
 * product no longer ships at that path — an install may hold any past version
 * of its contents, and all of it goes. Entries that do not exist are skipped,
 * so old ones cost nothing.
 */
const RETIRED_DIRS = [
  // 6.6.2 — cTrader withdrawn as a forex provider. Both API folders and the
  // admin OAuth callback page went whole, and the compiled one is the live one.
  "backend/src/api/(ext)/admin/forex-trading/ctrader-oauth",
  "backend/dist/src/api/(ext)/admin/forex-trading/ctrader-oauth",
  "frontend/app/[locale]/(ext)/admin/forex-trading/provider/ctrader-callback",

  // Superseded routing schemes and route groups.
  "frontend/app/[lang]",
  "frontend/app/settings",
  "frontend/app/[locale]/auth",
  "frontend/app/[locale]/checkout",
  "frontend/app/[locale]/(app)",
  "frontend/app/[locale]/(ext)/(ico)",
  "frontend/app/[locale]/(dashboard)/admin/(ext)",
  "frontend/app/[locale]/(utility)/comming-soon",
  "frontend/app/[locale]/(utility)/maintinance",

  // Admin pages folded into the surface beside them. `template/[id]` is the one
  // that broke the demo build: the editor became a panel of the template page.
  "frontend/app/[locale]/(dashboard)/admin/system/notification/template/[id]",
  "frontend/app/[locale]/(dashboard)/admin/system/log",
  "frontend/app/[locale]/(dashboard)/admin/system/upgrade-helper",
  "frontend/app/[locale]/(dashboard)/admin/crm/kyc/applicant",
  "frontend/app/[locale]/(dashboard)/admin/crm/kyc/template",
  "frontend/app/[locale]/(dashboard)/admin/crm/support/ticket",
  "frontend/app/[locale]/(dashboard)/admin/default-editor/[pageId]/preview",
  "frontend/app/[locale]/(dashboard)/admin/finance/binary/duration",
  "frontend/app/[locale]/(dashboard)/admin/finance/exchange/[id]",

  // Extension routes removed with their rewrites.
  "frontend/app/[locale]/(ext)/admin/ecommerce-old",
  "frontend/app/[locale]/(ext)/admin/ecommerce/category/edit",
  "frontend/app/[locale]/(ext)/admin/ecommerce/category/new",
  "frontend/app/[locale]/(ext)/admin/ecommerce/product/edit",
  "frontend/app/[locale]/(ext)/admin/ecommerce/product/new",
  "frontend/app/[locale]/(ext)/admin/ecommerce/report",
  "frontend/app/[locale]/(ext)/admin/ico/offer/[id]/edit",
  "frontend/app/[locale]/(ext)/admin/nft/staking",
  "frontend/app/[locale]/(ext)/admin/staking/edit",
  "frontend/app/[locale]/(ext)/forex-trading/account",
  "frontend/app/[locale]/(ext)/forex/trading",
  "frontend/app/[locale]/(ext)/ico/creator/plan",
  "frontend/app/[locale]/(ext)/staking/pools",
  "frontend/app/[locale]/(ext)/nft/analytics",
  "frontend/app/[locale]/(ext)/nft/bridge",
  "frontend/app/[locale]/(ext)/nft/community",
  "frontend/app/[locale]/(ext)/nft/creator/ai-tools",
  "frontend/app/[locale]/(ext)/nft/creator/dashboard",
  "frontend/app/[locale]/(ext)/nft/dashboard",
  "frontend/app/[locale]/(ext)/nft/gamification",
  "frontend/app/[locale]/(ext)/nft/mobile",
  "frontend/app/[locale]/(ext)/nft/recommendations",
  "frontend/app/[locale]/(ext)/nft/social",
  "frontend/app/[locale]/(ext)/nft/trading",

  // ---- P2P rework: the section was rebuilt around four surfaces -----------
  // /p2p/dashboard, /p2p/guided-matching, /p2p/guide and the /p2p/offer table
  // all became redirects; their page.tsx survives as the stub, so only the
  // component folders below are gone entirely. The trade room lost its tabbed
  // internals to trade/[id]/components/room/.
  "frontend/app/[locale]/(ext)/p2p/dashboard/components",
  "frontend/app/[locale]/(ext)/p2p/guided-matching/components",
  "frontend/app/[locale]/(ext)/p2p/guide/components",
  "frontend/app/[locale]/(ext)/p2p/offer/components",
  "frontend/app/[locale]/(ext)/p2p/offer/create/components",
  "frontend/app/[locale]/(ext)/p2p/trade/components",

  // ---- Test consolidation: every test now lives in the top-level e2e/ ------
  // backend/tests moved to e2e/{unit,integration,live}/, the colocated frontend
  // vitest files to e2e/unit/frontend/, and backend/src/utils/__tests__ went
  // with them. Listed here because an update EXTRACTS OVER an install and
  // deletes nothing: without this, an updated machine keeps the old copies and
  // `jest`/`vitest` happily collect BOTH, so a suite that was deleted or
  // rewritten upstream keeps passing locally from a file nobody edits any more.
  "backend/tests",
  "backend/src/utils/__tests__",
];

const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".turbo",
  "coverage",
  "public",
  "messages",
  "uploads",
]);

/**
 * Is `absFile` a deliberate facade over the directory it shadows?
 *
 * `binary-engine/utils.ts` sits beside `binary-engine/utils/` and re-exports it
 * while adding its own schemas — the shadowing is the POINT, and deleting the
 * file would take the schemas with it. A leftover from a previous version never
 * references the directory that replaced it, so "does it reach into `./<name>`"
 * separates the two cleanly and cheaply.
 */
function isFacadeOver(absFile, dirName) {
  let source;
  try {
    source = fs.readFileSync(absFile, "utf8");
  } catch {
    /* Unreadable: assume deliberate. Never delete on a guess. */
    return true;
  }
  return new RegExp(`["'\`]\\./${dirName}(/|["'\`])`).test(source);
}

/** Same-named sibling files that shadow an index barrel and are NOT facades. */
function findShadows(absDir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  const fileNames = new Set(entries.filter((e) => e.isFile()).map((e) => e.name));
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
    const child = path.join(absDir, entry.name);
    const shadow = SOURCE_EXTENSIONS.map((ext) => entry.name + ext).find((n) => fileNames.has(n));
    if (shadow && SOURCE_EXTENSIONS.some((ext) => fs.existsSync(path.join(child, `index${ext}`)))) {
      const absShadow = path.join(absDir, shadow);
      if (!isFacadeOver(absShadow, entry.name)) out.push(absShadow);
    }
    findShadows(child, out);
  }
  return out;
}

/**
 * Every `./x`, `../x` and `@/x` string in a source file.
 *
 * Deliberately not an import parser. It matches the LITERALS, so it sees static
 * imports, `import()`, `require()`, re-exports and `jest.mock()` alike without
 * knowing the difference — and it over-matches, catching plain strings that
 * merely look like specifiers. Over-matching is the safe direction here: a
 * false match keeps a file that could have gone (dead weight, the state we were
 * already in), while a missed one deletes a module something imports and takes
 * the build down. `$ { }` are excluded so an interpolated template literal,
 * which can never be a static specifier, is skipped rather than half-read.
 */
const SPECIFIER = /["'`](\.{1,2}\/[^"'`\r\n${}]*|@[\w.-]*\/[^"'`\r\n${}]*)["'`]/g;

/**
 * Is this line PROSE rather than code?
 *
 * The one thing over-matching must not do is read a comment. This codebase
 * explains itself in prose that names the modules it is talking about, and a
 * doc line quoting a path is not a reference to it — it is usually the exact
 * opposite. `support/ticket/[id]/loading.tsx` opens with
 *
 *     * under it, so with no boundary here the nearest one is `../loading.tsx`
 *
 * explaining why the file EXISTS: without it the parent's boundary would draw.
 * The parent is retired, the sentence about it was read as an import, and the
 * report kept the file and told the operator to re-extract the release. Nothing
 * about that clears — the sentence is in the current copy of the file, so the
 * fix it advises cannot work, and the warning prints on every build forever.
 *
 * Conservative on purpose, and only in the safe direction. A line whose first
 * characters are `//` or `*` cannot be code; a `/*` with no closer on the same
 * line opens a comment that runs past it. Anything else — including the closing
 * line of a block comment and a trailing `// see "./x"` — still over-matches,
 * which merely keeps a file that could have gone.
 */
const isProseLine = (line) => {
  const text = line.trimStart();
  if (text.startsWith("//") || text.startsWith("*")) return true;
  return text.startsWith("/*") && !text.includes("*/");
};

/** `frontend` or `backend` — which package's `@/` an importer means. */
function packageRootOf(abs) {
  const top = path.relative(ROOT, abs).split(path.sep)[0];
  return top === "frontend" || top === "backend" ? path.join(ROOT, top) : null;
}

/** A specifier as an absolute path, or null when it names a package. */
function resolveSpecifier(spec, importerAbs) {
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return path.resolve(path.dirname(importerAbs), spec);
  }
  /* Backend-only aliases, checked longest-first; resolving them from a frontend
     file costs nothing because the result matches no target. */
  if (spec.startsWith("@db/")) return path.join(ROOT, "backend", "models", spec.slice(4));
  if (spec.startsWith("@b/")) return path.join(ROOT, "backend", "src", spec.slice(3));
  if (spec.startsWith("@/")) {
    const pkg = packageRootOf(importerAbs);
    return pkg ? path.join(pkg, spec.slice(2)) : null;
  }
  return null; /* @radix-ui/…, next/…, a bare package. */
}

/** Compare paths the way a specifier does — `./client` and `client.tsx` are one. */
function stripExt(abs) {
  const ext = path.extname(abs);
  return SOURCE_EXTENSIONS.includes(ext) ? abs.slice(0, -ext.length) : abs;
}

function isDirectory(abs) {
  try {
    return fs.statSync(abs).isDirectory();
  } catch {
    return false;
  }
}

/** absolute source file -> the extensionless paths it points at. */
function collectImportGraph() {
  const graph = new Map();
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(abs);
        continue;
      }
      if (!SOURCE_EXTENSIONS.includes(path.extname(entry.name))) continue;
      let source;
      try {
        source = fs.readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      /* Line by line so a comment can be skipped. The specifier pattern already
         stops at a newline, so scanning per line matches exactly what scanning
         the whole file did — minus the prose. */
      const refs = [];
      for (const line of source.split("\n")) {
        if (isProseLine(line)) continue;
        for (const match of line.matchAll(SPECIFIER)) {
          const resolved = resolveSpecifier(match[1], abs);
          if (resolved) refs.push(stripExt(resolved));
        }
      }
      graph.set(abs, refs);
    }
  };
  for (const scanRoot of ["frontend", "backend"]) walk(path.join(ROOT, scanRoot));
  return graph;
}

/**
 * Drop the targets something on this install still imports (pass 4).
 *
 * Runs to a fixed point: keeping a directory makes its contents surviving files
 * whose own imports then count, which can keep another target, and so on. Two
 * rounds settles every real case, but the loop is what makes that a fact rather
 * than an assumption.
 */
function protectReferenced(fileTargets, dirTargets) {
  const graph = collectImportGraph();

  /* A file that shadows a same-named directory is never protected — see the
     header. `chart.tsx` beside `chart/` is exactly what we came to delete. */
  const byKey = new Map();
  for (const abs of fileTargets) {
    const key = stripExt(abs);
    if (!isDirectory(key)) byKey.set(key, abs);
  }

  const doomedFiles = new Set(fileTargets);
  let doomedDirs = [...dirTargets];
  const keptFiles = new Map();
  const keptDirs = new Map();

  for (;;) {
    let changed = false;
    for (const [importer, refs] of graph) {
      /* An importer on its own way out has no vote. */
      if (doomedFiles.has(importer)) continue;
      if (doomedDirs.some((dir) => importer.startsWith(dir + path.sep))) continue;
      for (const ref of refs) {
        const file = byKey.get(ref);
        if (file && doomedFiles.has(file)) {
          doomedFiles.delete(file);
          keptFiles.set(file, importer);
          changed = true;
        }
        const dir = doomedDirs.find((d) => ref === d || ref.startsWith(d + path.sep));
        if (dir) {
          doomedDirs = doomedDirs.filter((d) => d !== dir);
          keptDirs.set(dir, importer);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return { doomedFiles, doomedDirs, keptFiles, keptDirs };
}

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/");

/** Retired directories present on this install. */
const presentDirs = RETIRED_DIRS.map((entry) => path.join(ROOT, entry))
  .filter((abs) => {
    try {
      return fs.statSync(abs).isDirectory();
    } catch {
      return false;
    }
  })
  .sort();

/** Is `abs` inside one of `dirs`? */
const isUnder = (abs, dirs) => dirs.some((dir) => abs.startsWith(dir + path.sep));

/* Drop nested entries: the ancestor's recursive delete already takes them, and
   the leftover call would only warn about a path that is no longer there. */
const dirTargets = presentDirs.filter((abs) => !isUnder(abs, presentDirs));

/** Is `abs` inside a directory we are about to delete whole? */
const insideRetiredDir = (abs) => isUnder(abs, dirTargets);

const targets = new Set();
for (const entry of RETIRED) {
  const abs = path.join(ROOT, entry);
  if (fs.existsSync(abs) && !insideRetiredDir(abs)) targets.add(abs);
}
for (const scanRoot of ["frontend", "backend"]) {
  for (const abs of findShadows(path.join(ROOT, scanRoot))) {
    if (!insideRetiredDir(abs)) targets.add(abs);
  }
}

if (targets.size === 0 && dirTargets.length === 0) {
  console.log("  No stale files. Nothing to do.");
  process.exit(0);
}

/* Pass 4, reached only when there is something to delete — a healthy clone
   exits above and never pays for the scan. */
const { doomedFiles, doomedDirs, keptFiles, keptDirs } = protectReferenced(targets, dirTargets);

const byPath = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
const keptCount = keptFiles.size + keptDirs.size;
if (keptCount > 0) {
  console.warn(`  Kept ${keptCount} stale path(s): still imported on this install.`);
  [...keptDirs].sort(byPath).forEach(([abs, by]) => console.warn(`    ${rel(abs)}/  <- ${rel(by)}`));
  [...keptFiles].sort(byPath).forEach(([abs, by]) => console.warn(`    ${rel(abs)}  <- ${rel(by)}`));
  /* Whoever imports a module this release removed is running last release's
     copy of itself. Naming them is the point: that list IS the set of files the
     update failed to overwrite. */
  console.warn("  Each importer above still expects a module this release removed,");
  console.warn("  so it is an OLD copy that the update did not overwrite. Re-extract");
  console.warn("  the release over this install, then run `pnpm clean:stale` again.");
}

const removeFiles = [...doomedFiles].sort();
const removeDirs = [...doomedDirs].sort();

if (removeFiles.length === 0 && removeDirs.length === 0) {
  console.log("  Nothing left that is safe to remove.");
  process.exit(STRICT && keptCount > 0 ? 1 : 0);
}

if (!APPLY) {
  const total = removeFiles.length + removeDirs.length;
  console.log(`  ${total} stale path(s) would be removed:`);
  removeDirs.forEach((abs) => console.log(`    ${rel(abs)}/  (directory)`));
  removeFiles.forEach((abs) => console.log(`    ${rel(abs)}`));
  console.log("  Run without --check to delete them.");
  process.exit(STRICT ? 1 : 0);
}

let removed = 0;
for (const abs of removeDirs) {
  try {
    fs.rmSync(abs, { recursive: true });
    console.log(`  Removed ${rel(abs)}/ (directory)`);
    removed++;
  } catch (error) {
    /* Not fatal: a leftover we could not delete is the state we were already
       in, and the next.config guard keeps the build working regardless. */
    console.warn(`  Could not remove ${rel(abs)}/: ${error.message}`);
  }
}
for (const abs of removeFiles) {
  try {
    fs.rmSync(abs);
    console.log(`  Removed ${rel(abs)}`);
    removed++;
  } catch (error) {
    console.warn(`  Could not remove ${rel(abs)}: ${error.message}`);
  }
}
console.log(`  ${removed} stale path(s) removed.`);
