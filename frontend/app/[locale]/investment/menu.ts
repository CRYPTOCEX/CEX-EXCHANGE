import { NAV_COLOR_SCHEMAS } from "@/lib/nav-color-schema";

/**
 * Investment navigation: four destinations collapsed to three.
 *
 * WHAT WAS THERE
 * --------------
 *   Home · Investment Plans · Dashboard · History
 *
 * "Dashboard" and "History" were two doors into one room. The dashboard held
 * four KPI tiles, an active-investment panel and a list of the five most recent
 * investments; History was a data table of the same rows, reached from a second
 * nav item — and because the dashboard capped its list at five while fetching a
 * hundred, the only way to see the sixth was to notice a "view all" link that
 * appeared conditionally. Nothing has been removed; both became sections of
 * `/investment/portfolio`, running positions first.
 *
 * Both old paths still resolve — see the redirect stubs at `dashboard/page.tsx`
 * and `history/page.tsx` — because they have been linked from emails,
 * notifications and the main site menu for as long as the product has existed.
 *
 * "Invest" is deliberately NOT here. It is an action, and an action in a nav bar
 * competes with the places you can go; it lives on every plan card and at the
 * head of the portfolio.
 *
 * ON `key`
 * --------
 * `key` IS the translation path: `useMenuTranslations` rewrites `-` to `.` and
 * looks up `<namespace>.<navPrefix>.<key>.title`, i.e. `investment.nav.
 * portfolio.title` here. A key with no entry in the bundle falls back to the
 * English `title` below rather than rendering the path, so a locale that has
 * not caught up degrades to English instead of to `nav.portfolio.title`.
 *
 * `_customTitle` is deliberately NOT set. P2P sets it on every entry to silence
 * missing-translation logs, but it short-circuits the lookup permanently — the
 * item can never be translated afterwards. These keys are added to the
 * `investment` namespace in the same change, so the lookup succeeds.
 *
 * TWO OF THE TITLE KEYS ARE GONE ON PURPOSE (2026-08-05).
 * `investment.nav.overview.title` and `nav.plans.title` held nothing but the
 * English words "Overview" and "Plans", which `common.overview` and
 * `common.plans` already carry translated in 89 and 85 locales. The menu
 * translator cannot reach `common` — it looks up ONE namespace, the one derived
 * from the route — so the duplicate was structural and the two keys were the
 * only removable half. Neither had a single translation in ninety bundles, and
 * `getTitle` falls back to the English `title` below, so the nav renders exactly
 * what it rendered before.
 *
 * The cost, stated plainly: these two labels can no longer be translated by
 * adding a locale value, because `key` is computed and the extractor never
 * collects it — that is why they sat at 0/89 in the first place. `portfolio`
 * keeps its key ("My investments" is not a duplicate of anything) and all three
 * descriptions keep theirs. To translate these two titles again, re-add the keys
 * and accept that the namespace optimizer will report them.
 */
export const menu: MenuItem[] = [
  {
    /*
      `exact: true` matters. The active-state rule is longest-matching-href, and
      prefix matching otherwise — without it this entry would light up on every
      `/investment/*` route and read as permanently selected.
    */
    key: "overview",
    title: "Overview",
    /*
      `_customTitle` after all, and the note above explains why it is not the
      short-circuit it warns against.

      That note rejected this flag on the grounds that it makes an item
      permanently untranslatable — and then, four paragraphs later, states the
      cost of removing the key: "these two labels can no longer be translated by
      adding a locale value, because `key` is computed and the extractor never
      collects it". Both cannot be true of the same entry. The key is gone, so
      the lookup is already unreachable and the label is already English-only;
      the flag changes nothing about what renders.

      What it does change is the noise. `getTitle` looks up
      `investment.nav.overview.title`, misses, logs "[i18n] Missing translation"
      and falls back — on EVERY render, for a key that was deleted on purpose.
      The frontend live driver counts console warnings, so this cost ten checks
      across /en/investment and /en/investment/plan, and a warning that fires by
      design on a healthy page is exactly what trains people to ignore the ones
      that matter.

      `blog-nav.tsx` already does this for the same reason, and the contract in
      types/menu.d.ts asks for it whenever "the label cannot come from a key".
      Here it cannot.
    */
    _customTitle: true,
    href: "/investment",
    icon: "lucide:home",
    exact: true,
    description:
      "What these plans are, how a term settles, and what the platform is running right now.",
  },
  {
    key: "plans",
    title: "Plans",
    // Same as `overview` above: the key was deleted on purpose, so the lookup
    // can only ever miss, warn and fall back to this English title.
    _customTitle: true,
    href: "/investment/plan",
    icon: "lucide:layers",
    description:
      "Every plan open for new investment, with its rate, its terms, the currency it takes and what it pays at maturity.",
  },
  {
    /*
      `auth: true` for the same reason P2P marks its own: to a signed-out
      visitor this is a door onto a sign-in wall, and the layout filters those
      out rather than showing them.
    */
    key: "portfolio",
    title: "My investments",
    href: "/investment/portfolio",
    icon: "lucide:wallet",
    auth: true,
    description:
      "Positions you have running, how long each has left, and everything that has already settled.",
  },
];

export const colorSchema = NAV_COLOR_SCHEMAS.default;

/**
 * `/admin/ai/investment` — the AI Investment EXTENSION's console — is where this
 * pointed. That addon is a different product with its own models
 * (`aiInvestmentPlan`, `aiInvestment`), its own routes under `(ext)/ai/…` and
 * its own settlement cron; an operator following the shortcut from this product
 * arrived at a console whose plans do not appear on these pages and whose edits
 * do nothing to them.
 *
 * The general investment product's console is under `/admin/finance/investment`,
 * which has no index page of its own — only `plan`, `duration` and `history` —
 * so the shortcut points at `plan`, the screen that owns everything the pages
 * below it render.
 */
export const adminPath = "/admin/finance/investment/plan";
