"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { useSidebar } from "@/store";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/icon";
import {
  Moon, Sun, Search, Command, ChevronDown, ChevronLeft,
  User, Settings, Menu, Wallet, Home
} from "lucide-react";
import { useTranslations } from "next-intl";
import { getMenu } from "@/config/menu";
import { useSettings } from "@/hooks/use-settings";
import { useMenuTranslations } from "@/components/partials/menu-translator";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";
import { NotificationBell } from "./notification-bell";
import LanguageSelector from "./language-selector";
import NavbarLogo from "@/components/elements/navbar-logo";
import { WalletPopover } from "./wallet-popover";
import { ProfileMenuPanel, getUserInitials } from "./profile-menu";

// Dropdown and menu components
import MegaDropdown from "./mega-dropdown";
import CommandPalette from "./command-palette";
import TokenSearch from "./token-search";
import { OperationsInbox } from "./operations-inbox";
import MobileMenu from "./mobile-menu";
import NavbarLayout from "./navbar-layouts";
import { useChrome } from "@/components/chrome/chrome-provider";
import { getNavbarVariant } from "@/lib/chrome/variants";
import { applyMenuOverrideForScope, menuScopeFor } from "@/lib/chrome/menu-scope";
import { filterCustomMenu } from "@/lib/chrome/menu-gates";

// Color schema utilities
import { NAV_COLOR_SCHEMAS, getColorHex, getGradientStyle, type NavColorSchema, getAccentAlpha } from "@/lib/nav-color-schema";

export interface SiteHeaderProps {
  /**
   * Header variant - auto-detected from pathname if not provided
   * - "admin": Full admin navigation with command palette, mega dropdowns
   * - "user": Standard user navigation
   * - "extension": Extension pages with back button and custom menu
   */
  variant?: "admin" | "user" | "extension";

  /** Menu type or custom menu items */
  menu?: "user" | "admin" | MenuItem[];

  /** Custom controls to show on the right side */
  rightControls?: React.ReactNode;

  /** Custom admin path for extension toggle (e.g., "/admin/copy-trading") */
  adminPath?: string;

  /** Custom user path for extension toggle (e.g., "/staking") - used in admin areas */
  userPath?: string;

  /** Color schema for themed navigation */
  colorSchema?: NavColorSchema;

  /** Show back button (auto-enabled for extension variant) */
  showBackButton?: boolean;

  /** Custom back button href */
  backButtonHref?: string;

  /** Additional class names */
  className?: string;

  /** Navbar layout id from the chrome store. Defaults to "classic". */
  navbarVariant?: string;

  /**
   * Translation namespace for menu items
   * - For main admin/user menus: "menu" (default)
   * - For extensions: e.g., "ext_p2p" or "ext_admin_p2p"
   */
  translationNamespace?: string;

  /**
   * Translation key prefix for navigation items within the namespace
   * - For main menus: "" (default, keys like "admin.dashboard.title")
   * - For extensions: "nav" (keys like "nav.home.title")
   */
  translationNavPrefix?: string;
}

/**
 * The header's own background, behind its contents.
 *
 * This is the fix for the colour band that ran across the top of every landing
 * page. The header is `fixed` and every landing page's ground (`PageBackground`)
 * extends underneath it, so whatever the header paints is a full-width rectangle
 * sitting on top of that ground — and a rectangle has a bottom edge. At rest the
 * header used to paint three of them at once:
 *
 *   - `bg-background/40` at `opacity-60`, i.e. an opaque-ish 24% wash that
 *     knocked the accent glow down inside the header's box and nowhere else;
 *   - `backdrop-blur-md`, which smears the ground's ruled grid inside the box
 *     and leaves it crisp one pixel below;
 *   - a second copy of the film grain the landing pages already apply globally.
 *
 * None of the three has anything to fade them out, and at rest there is no
 * hairline border to explain the transition, so all three terminated in the same
 * hard horizontal line 64px down the page. That line is what read as "the colour
 * is cut" under the nav.
 *
 * Scrolled, a flat wash is right: the bar has a border and a shadow, so the edge
 * is declared rather than accidental. At rest the scrim is a gradient that
 * reaches zero before the bottom of the header, which has no edge to see.
 */
function HeaderScrim({ isScrolled }: { isScrolled: boolean }) {
  return (
    <>
      {/* At rest — fades out well before the header's bottom edge. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-500",
          isScrolled ? "opacity-0" : "opacity-100"
        )}
        style={{
          background:
            "linear-gradient(to bottom, hsl(var(--background) / 0.55) 0%, hsl(var(--background) / 0.28) 45%, hsl(var(--background) / 0) 100%)",
        }}
      />

      {/* Scrolled — flat, under the hairline that makes it a bar. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 bg-background/40 transition-opacity duration-500",
          isScrolled ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Grain, for the scrolled bar only. Landing pages already lay their own
          film grain over the whole viewport; a second copy inside the header's
          box is one more rectangle with an edge. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-500 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]",
          isScrolled ? "opacity-[0.015]" : "opacity-0"
        )}
      />
    </>
  );
}

/**
 * True once React has hydrated, false during SSR and the hydration render.
 *
 * ONE source of client-only state needs it: **next-themes**. `resolvedTheme` is
 * undefined server-side because the preference lives in localStorage, so reading
 * it directly mismatches the sun/moon glyph.
 *
 * `useUserStore` USED TO NEED IT TOO and no longer does — see the note beside
 * `signedIn`. Do not put an auth-derived value back behind this gate.
 *
 * `useSyncExternalStore` with a constant server snapshot is the built-in way to
 * express that. It replaces a `useState(false)` + `useEffect(setMounted)` pair
 * that ALSO used to gate the entire header behind an early `return null`.
 */
const subscribeNever = () => () => {};
/**
 * The header's outer shell — fixed bar, scrim, hairlines.
 * ============================================================================
 *
 * SHARED BY EVERY NAVBAR VARIANT, AND DELIBERATELY NOT PART OF ONE.
 *
 * The admin and user branches each carried a byte-identical copy of this, down
 * to the comments. Two copies was survivable. It stops being survivable once an
 * admin can PICK a navbar, because of what lives in here: `layout` +
 * `layoutScroll` + `layoutRoot` are three framer props that look decorative and
 * are not. Drop any one and the shared-layout nav underline measures its start
 * position at the wrong scroll offset, so changing tab after scrolling makes the
 * indicator fly in from hundreds of pixels below the bar. The bug is invisible
 * at the top of a page, which is exactly why it survived long enough to earn the
 * 30-line comment below.
 *
 * A variant that owned its own `<m.header>` would have to re-derive that
 * contract, and the fourth one somebody adds would quietly get it wrong. So the
 * shell is fixed, and a variant only arranges what goes INSIDE the bar.
 */
function HeaderShell({
  isScrolled,
  colorSchema,
  headerRef,
  className,
  children,
}: {
  isScrolled: boolean;
  colorSchema?: NavColorSchema;
  headerRef: React.Ref<HTMLElement>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <m.header
      layout
      layoutScroll
      layoutRoot
      ref={headerRef}
      data-site-header=""
      className={cn(
        /*
         * `right-[var(--assistant-rail)]`, NOT `right-0`.
         * --------------------------------------------------------------------
         * This bar is `fixed`, so it is positioned against the VIEWPORT and
         * inherits nothing from the padding the pinned assistant puts on <body>.
         * Left alone it keeps spanning the full width and slides underneath the
         * panel, taking the command palette and the whole top nav with it.
         *
         * The variable is `0px` for everybody who has not pinned anything, so
         * this is byte-for-byte the old behaviour until somebody asks for the
         * gutter — and it is declared HERE, on the element, rather than in a
         * descendant rule in globals.css. Same computed result, one less thing
         * that can stop matching: no selector to lose a specificity argument, and
         * nothing for a future `className` to slip past. `transition-all` above
         * already animates it.
         */
        "fixed top-0 left-0 right-[var(--assistant-rail)] z-50 transition-all duration-500",
        isScrolled
          ? "bg-background/80 backdrop-blur-2xl border-b border-border shadow-2xl shadow-shadow/30"
          : "bg-transparent",
        className
      )}
    >
      <HeaderScrim isScrolled={isScrolled} />

      {/* Accent hairline along the top edge. */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: colorSchema
            ? `linear-gradient(to right, transparent, ${getAccentAlpha(0.6)}, transparent)`
            : `linear-gradient(to right, transparent, hsl(var(--primary) / 0.6), transparent)`,
        }}
      />

      {/* Separator hairline, faded in on scroll. One rule for both themes, from
          the border token rather than a per-theme rgba. */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-px transition-opacity duration-500",
          isScrolled ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: `linear-gradient(to right, transparent, ${
            colorSchema ? getAccentAlpha(0.19) : "hsl(var(--border-strong))"
          }, transparent)`,
        }}
      />

      <div className="relative z-10 container mx-auto px-4">{children}</div>
    </m.header>
  );
}

function useIsHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}

/**
 * The brand's RESERVED BOX. Wrap every `NavbarLogo` in the bar with this.
 * ============================================================================
 *
 * THE DEFECT IT FIXES — a 4px upward jerk of the whole left group, on every
 * route, at ~700ms. Measured by `scripts/measure-layout-shift.mjs` as
 * `div.flex.items-center.gap-4 [dy -4]`, and it was in the frame source list of
 * all 12 routes sampled.
 *
 * WHY IT MOVED. The logo the bar draws is an admin SETTING —
 * `settings.navbarLogoDisplay` — and `NavbarLogo` reads it from the config
 * store, which is persisted to localStorage and therefore rehydrates AFTER the
 * server HTML has painted. The server has no localStorage, so it always renders
 * the coded default (`SQUARE_WITH_NAME` -> `<Logo type="icon">` -> `h-10`,
 * 40px). This install is set to `FULL_LOGO_ONLY` (`<Logo type="text">` ->
 * `lg:h-12`, 48px), so a few hundred milliseconds later the brand swapped and
 * the box grew by exactly 8px.
 *
 * The 8px became a 4px shift because everything in the bar is `items-center`:
 * the left group is centred inside `h-header`, so 8px of growth lifts its top
 * edge by half that. And because the bar is `fixed` at the very top of the
 * viewport, that 4px is scored against the FULL viewport width — the most
 * expensive place on the page for a small shift, and it lands in the same CLS
 * session window as whatever else the route was settling, inflating those
 * frames too.
 *
 * THE FIX IS A BOX, NOT A BRANCH. We cannot know which logo is coming — the
 * setting is not in the server HTML and `ChromeConfig` does not carry it — so
 * there is nothing to render "correctly" on the first paint. What we CAN do is
 * make the answer not matter: reserve the taller of the two variants at every
 * breakpoint and centre whichever one arrives inside it.
 *
 *   <lg   `Logo` is `h-9` for BOTH types    -> `h-9`  (36px), nothing to do
 *   >=lg  icon is `h-10` (40), text `h-12`  -> `h-12` (48px), the max
 *
 * So the reserved box is the `text` variant's own height, which is the ceiling.
 * The row is then 48px from first paint whatever the setting says, and the
 * 40px icon simply sits centred in it — visually identical to today, because
 * the group was already centred inside the 64px bar and every ancestor between
 * is `items-center` too. Nothing moves, nothing looks different.
 *
 * DO NOT replace this with a fixed height on the header row: the row is already
 * `h-header` and is not what moved. It was the group INSIDE it.
 *
 * AND THE ALIGNMENT IS `stretch`, NOT `items-center`. This is the second half of
 * the fix and it was measured, not reasoned: pinning the wrapper alone moved the
 * shift one level down rather than removing it. `NavbarLogo`'s own `<a>` is a
 * flex box whose height is its content's, so it was still 40px inside a 48px
 * `items-center` parent — offset 4px from the top — and grew to 48px on the
 * swap, which the harness duly re-reported as `a.flex.items-center.gap-3
 * [dy -4]`. Letting the anchor STRETCH to the reserved height gives it a
 * constant box with a constant top edge, and its own `items-center` keeps the
 * mark optically centred exactly as before. Growing downward from a fixed top
 * edge is not a layout shift; being re-centred is.
 *
 * `stretch` is flexbox's default `align-items`, so it is spelled by the ABSENCE
 * of `items-center` here. That is easy to "tidy" back in — don't.
 *
 * THE THIRD LEVEL, `[&>a>div]:h-full`. The anchor has its OWN `items-center`
 * (it is `NavbarLogo`'s, and this file does not own it), so with the anchor
 * pinned the harness simply re-reported the next box down — `Logo`'s container,
 * `h-10` vs `lg:h-12`, re-centred by 4px on the swap. Pinning it to the slot
 * makes both variants 48px and the top edge constant.
 *
 * It is visually inert, which is the only reason a reach into a child's markup
 * is acceptable here: the image inside is `w-full h-full object-contain`, so a
 * square mark in a 40x48 box still paints 40x40, vertically centred — exactly
 * what a 40x40 box painted. Below `lg` both variants are already `h-9` and the
 * rule is a no-op. If `NavbarLogo` ever stops putting the mark in a direct
 * `<div>` child, this selector stops matching and the header degrades to the
 * 4px jerk it had before — it cannot break anything, it can only stop helping.
 *
 * WHAT THIS DOES NOT FIX, deliberately: the mark's WIDTH. The square variant is
 * 40px wide and the wordmark 220px, so the swap still slides the nav sideways.
 * Reserving 220px would leave ~80px of dead space on every install that uses the
 * square mark, which is a design decision this file has no business making. The
 * real fix is upstream — `navbarLogoDisplay` needs to reach the server render,
 * the way `ChromeConfig` already carries `navbarVariant` — and that is neither
 * this file nor `components/elements/navbar-logo`.
 */
const BRAND_BOX = "hidden min-[560px]:flex h-9 lg:h-12 [&>a>div]:h-full";

export default function SiteHeader({
  variant,
  menu,
  rightControls,
  adminPath,
  userPath,
  colorSchema,
  showBackButton,
  backButtonHref,
  className,
  navbarVariant,
  translationNamespace = "menu",
  translationNavPrefix = "",
}: SiteHeaderProps) {
  /* The navbar layout, resolved server-side and delivered by `ChromeProvider`.
     An explicit `navbarVariant` prop still wins, which is what lets the admin
     picker preview a layout without saving it. */
  const chrome = useChrome();
  const effectiveNavbarVariant = navbarVariant ?? chrome.navbarVariant;
  /* Does this layout show desktop navigation at all? `minimal` does not - it
     moves navigation into the drawer - and the drawer's only trigger is the
     hamburger, whose own class is `xl:hidden`. Left alone, `minimal` at >=xl
     would render a header with no navigation and no way to reach any, which is
     not "the quietest option", it is a dead end. The registry already declares
     this, so the trigger's visibility is derived from the capability rather
     than from a second hardcoded list that could disagree with it. */
  const showsDesktopNav = getNavbarVariant(effectiveNavbarVariant).capabilities.nav;
  /* The registry already declares which layouts have room for a search box —
     `centered` gives that width to the nav column and `minimal` has no room at
     all — so the box asks the capability rather than a second list here that
     could disagree with the picker the owner chose from. */
  const showsSearch = getNavbarVariant(effectiveNavbarVariant).capabilities.search;

  const t = useTranslations("common");
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user, hasPermission } = useUserStore();
  const { settings } = useConfigStore();
  const { settings: hookSettings, extensions, settingsFetched } = useSettings();
  const { getTitle, getDescription } = useMenuTranslations(translationNamespace, translationNavPrefix);
  const { mobileMenu, setMobileMenu } = useSidebar();

  // State
  const mounted = useIsHydrated();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Breakpoints are CSS, not JS.
  //
  // `useMediaQuery` reports false until an effect has run, so on the first
  // client render the desktop nav and the command-palette button did not exist
  // — they were mounted a frame later, on top of a header that had itself only
  // just appeared. Tailwind's `xl:`/`2xl:` variants decide the same thing in
  // the stylesheet, so the correct layout is in the server HTML and nothing
  // pops in.
  const isDark = mounted ? resolvedTheme === "dark" : false;
  const layoutSwitcherEnabled = settings?.layoutSwitcher === true || settings?.layoutSwitcher === "true";

  /*
    ───────────────────────────────────────────────────────────────────────────
    THE AUTH-DERIVED CONTROLS ARE READ DIRECTLY. THEY USED TO BE HELD BACK UNTIL
    HYDRATION, AND THAT GATE IS NOW THE BUG RATHER THAN THE FIX.

    The gate was written when `useUserStore` was `persist()`ed: `user` came out
    of localStorage in a state initialiser, so it was already populated on the
    client's FIRST render and necessarily null during SSR. `mounted ? user :
    null` made the two sides agree by making the client's first render pretend
    to be signed out, which is what the server was doing anyway.

    THE STORE IS NOT PERSISTED ANY MORE. `store/auth-boot.ts` resolves the
    session per REQUEST and `seedUserStoreFromServer` writes that same profile
    into the client store during `Providers`' render — before anything below it
    renders, hydration pass included. So `user` is identical on both sides by
    construction, and there is nothing left for the gate to reconcile.

    WHAT IT DID INSTEAD, once the server knew who was signed in:

      - `<ProfileButton user={null}>` fell through to its signed-out fallback,
        `AuthHeaderControls` — which does NOT gate, reads the store raw, sees
        the real user and renders `ProfileInfo`. So the SERVER HTML carried
        ProfileInfo's Radix dropdown and shadcn `Avatar`, and one commit after
        hydration `mounted` flipped, `signedIn` became the user, and
        `ProfileButton` threw all of it away for its own avatar button.
        Measured on /en/admin: 1 `[data-slot="avatar"]` in the server HTML,
        0 in the DOM a second later. Two different profile menus, one swap per
        page load.
      - Two components in the same slot therefore answered "is anyone signed
        in?" DIFFERENTLY in the same render — which is what turned any
        transient disagreement into "Hydration failed" pointing at `Avatar`
        inside `ProfileInfo`, three components below the one to blame.
      - The operations inbox, the notification bell, the wallet popover and the
        admin/user toggle were all absent from the server HTML again and popped
        in after hydration — the exact CLS the boot-auth rework exists to
        remove.

    `isDark` KEEPS ITS GATE. next-themes genuinely is client-only: the
    preference is in localStorage and the server cannot know it. Auth is not
    like that any more.
    ───────────────────────────────────────────────────────────────────────────
  */
  const signedIn = user;
  const showAdminToggle = hasPermission("access.admin");

  // Get effective color schema
  const schema = colorSchema || NAV_COLOR_SCHEMAS.default;
  const primaryColor = getColorHex(schema.primary, isDark);
  const secondaryColor = schema.secondary ? getColorHex(schema.secondary, isDark) : primaryColor;
  const gradientStyle = getGradientStyle(schema, isDark);

  // Auto-detect variant from pathname
  const isInAdminArea = pathname.startsWith("/admin");
  const effectiveVariant = variant || (isInAdminArea ? "admin" : "user");
  const isAdmin = effectiveVariant === "admin";
  const isExtension = effectiveVariant === "extension";
  const isCustomMenu = Array.isArray(menu);

  // Determine menu type
  const menuType = menu || (isAdmin ? "admin" : "user");

  /**
   * Which stored override this header's menu answers to.
   *
   * THE SINGLE INJECTION POINT FOR ALL 32 ADDONS. Every addon layout renders its
   * own menu through this one component, so scoping it here covers all of them
   * without touching a single layout file.
   *
   * A custom menu is scoped by its `translationNamespace` — unique per menu
   * because the namespace registry derives `ext_{id}` for the user side and
   * `ext_admin_{id}` for the admin side. Addon item keys collide constantly (21
   * of them are keyed `dashboard`), so a scope that did not separate them would
   * make hiding one addon's dashboard hide twenty. See `lib/chrome/menu-scope.ts`
   * for the rule and for why an undeclared namespace resolves to `null` instead
   * of a shared bucket.
   *
   * The CORE menus are not scoped here: `getMenu` derives `admin`/`user` from
   * the `activeMenuType` it was given, so all three of its call sites stay
   * uniform and none of them can pick the wrong key.
   */
  const customMenuScope = React.useMemo(
    () => (isCustomMenu ? menuScopeFor({ namespace: translationNamespace }) : null),
    [isCustomMenu, translationNamespace]
  );

  // Calculate paths
  const defaultBackHref = isInAdminArea ? "/admin" : "/";
  const effectiveBackHref = backButtonHref || defaultBackHref;
  const shouldShowBackButton = showBackButton ?? (isExtension && isCustomMenu && isInAdminArea);

  // User/Admin toggle path
  const userEquivalentPath = React.useMemo(() => {
    if (!isInAdminArea) {
      return adminPath || "/admin";
    }

    // If explicit userPath is provided (used by extensions), use it
    if (userPath) {
      return userPath;
    }

    // For non-extension admin pages, always go to home
    // Extensions handle their own userPath in their layouts
    return "/";
  }, [isInAdminArea, userPath, adminPath]);

  // Note: Theme is controlled by ThemeProvider in providers.tsx
  // When layoutSwitcher is disabled, the defaultTheme is already set in ThemeProvider
  // We don't need to force it here as it would override the user's stored preference on every mount

  /*
   * Scroll effect — and it PUBLISHES the answer, it does not merely keep it.
   *
   * -------------------------------------------------------------------------
   * ONE WRITER, BECAUSE TWO SURFACES HAVE TO AGREE FRAME FOR FRAME
   * -------------------------------------------------------------------------
   * The bar goes from transparent to a blurred wash at a threshold this effect
   * owns. The pinned assistant sits directly beside it at the same height, so
   * the two are read as one strip — and if the panel had its own listener the
   * thresholds would be two numbers that must never diverge, with the failure
   * showing as the halves of that strip changing colour at different moments
   * while somebody scrolls. That is the kind of thing nobody can unsee.
   *
   * So the state is written onto <html> and the stylesheet drives the panel from
   * it. No second listener, no second threshold, and nothing to keep in sync.
   */
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 10;
      setIsScrolled(scrolled);
      const root = document.documentElement;
      if (scrolled) root.setAttribute("data-page-scrolled", "true");
      else root.removeAttribute("data-page-scrolled");
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      // A route without this header must not inherit the last page's state.
      document.documentElement.removeAttribute("data-page-scrolled");
    };
  }, []);

  // Command palette keyboard shortcut (admin only)
  useEffect(() => {
    if (!isAdmin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setActiveMenu(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdmin]);

  // Get menu items
  const menuItems = React.useMemo(() => {
    if (isCustomMenu) {
      /* The addon's own tree, exactly as its layout built it, with the override
         as the last transform — the same position it holds inside `getMenu`.
         There is no permission filter to run after it here, because these menus
         do not carry one: an addon's routes are guarded server-side, and this
         array is whatever `./menu` exports for that extension. So the override
         can only ever subtract from, relabel or reorder what the addon shipped;
         it has nothing to resurrect. */
      /* The three declarative gates an addon entry can carry — extension,
         settings, settingConditions — evaluated the way `getMenu` evaluates
         them for the core menus. They ran nowhere for these trees before, so
         a per-mode entry rendered in every mode. Applied before the override,
         which keeps its place as the last transform. */
      return applyMenuOverrideForScope(
        filterCustomMenu(menu as MenuItem[], { settings: hookSettings, extensions }),
        chrome.menuOverrides,
        customMenuScope
      );
    }

    // Build as soon as settings EXIST, rather than waiting for this session's
    // fetch to resolve.
    //
    // `settings` and `extensions` are persisted to localStorage by the config
    // store and rehydrate before first paint; `settingsFetched` is deliberately
    // not persisted, so it is false on every load until the network round-trip
    // lands. Gating on it meant a returning user — whose menu we already had on
    // disk — watched an empty nav bar until the API answered. Only a genuinely
    // first-ever visit has nothing to draw.
    const hasSettings =
      settingsFetched ||
      (hookSettings && Object.keys(hookSettings).length > 0);
    if (!hasSettings) return [];

    return getMenu({
      user,
      settings: hookSettings,
      extensions,
      activeMenuType: menuType as "user" | "admin",
      menuOverrides: chrome.menuOverrides,
    });
    /* `chrome.menuOverrides` and `customMenuScope` are dependencies, not
       incidental reads. This memo is what the navbar renders, and the editor
       pushes a new override object into the provider on every keystroke of a
       live preview; without the dep the menu would keep rendering the previous
       resolution until a full reload, which reads as "the editor did nothing".
       The value is identity-stable — one object per request, replaced wholesale
       by a preview — so this does not re-run on unrelated updates. */
  }, [
    user,
    hookSettings,
    extensions,
    settingsFetched,
    menu,
    menuType,
    isCustomMenu,
    chrome.menuOverrides,
    customMenuScope,
  ]);

  // Check if menu item is active
  const isActiveMenu = useCallback((item: MenuItem): boolean => {
    // For Dashboard or Home items, or items with exact=true, only mark active if exactly on that path
    // This prevents /forex from being active when on /forex/plan
    const key = item.key || "";
    const isHomeOrDashboard = key === "admin-dashboard" ||
                              key === "home" ||
                              key === "dashboard" ||
                              key.includes("-home") ||
                              key.includes("-dashboard");

    if (isHomeOrDashboard || item.exact) {
      // Exact match only for home/dashboard items or items with exact=true
      return pathname === item.href || pathname === item.href + "/";
    }

    // For items without href or with #, check children only
    if (!item.href || item.href === "#") {
      const checkChildren = (children: MenuItem[] | undefined): boolean => {
        if (!children) return false;
        return children.some(child => {
          if (pathname === child.href) return true;
          // Respect exact flag for children too
          if (child.exact) return false;
          if (child.href && child.href !== "#" && pathname.startsWith(child.href + "/")) return true;
          return checkChildren(child.child) || checkChildren(child.megaMenu);
        });
      };
      return checkChildren(item.child) || checkChildren(item.megaMenu);
    }

    // For regular items, check exact match or prefix match
    if (pathname === item.href) return true;
    if (pathname.startsWith(item.href + "/")) return true;

    // Also check children for parent items
    const checkChildren = (children: MenuItem[] | undefined): boolean => {
      if (!children) return false;
      return children.some(child => {
        if (pathname === child.href) return true;
        // Respect exact flag for children too
        if (child.exact) return false;
        if (child.href && child.href !== "#" && pathname.startsWith(child.href + "/")) return true;
        return checkChildren(child.child) || checkChildren(child.megaMenu);
      });
    };

    return checkChildren(item.child) || checkChildren(item.megaMenu);
  }, [pathname]);

  // Handle menu hover with delay (admin only)
  const handleMenuEnter = useCallback((key: string) => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    setActiveMenu(key);
  }, []);

  const handleMenuLeave = useCallback(() => {
    menuTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  }, []);

  // Mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenu(!mobileMenu);
  };

  // No `if (!mounted) return null` here any more.
  //
  // That one line was most of the "the navbar shows up late" feeling: it made
  // the header render nothing on the server AND nothing on the first client
  // render, so the page painted headerless, hydrated, ran an effect, and only
  // then produced a bar — which then slid down from y:-100 over half a second.
  // Roughly half a second of visible nothing on every single page load.
  //
  // Only the theme glyph actually needs to know we are on the client, and
  // `isDark` already handles that on its own.

  // Render Admin Header
  if (isAdmin) {
    return (
      <>
        {/* These three props are load-bearing. Do not drop them.
            (`layoutScroll` is the one that actually fixes the bug — see below.)

            THE BUG: the active-nav underline is a shared-layout element
            (`layoutId` "nav-indicator" in NavItem), so on every tab change
            framer measures where it was and animates it to where it now is.
            Both measurements are PAGE boxes — `measurePageBox()` adds the
            document scroll offset to the viewport rect. Meanwhile Next resets
            the scroll to top as it commits the new route, so the two
            measurements are taken at different scroll positions and their
            delta carries the full `window.scrollY`. Measured on
            /admin -> /admin/crm/user at scrollY 658, the underline started
            373px BELOW the bar and flew up into place. At the top of the page
            the bug was invisible, which is why it survived: it only appears if
            you scroll and then change tab.

            WHY `layoutScroll`: framer's `checkIsScrollRoot` for HTML is
            literally `getComputedStyle(el).position === "fixed"`, and this
            header is fixed. `layoutScroll` is what makes framer actually run
            `updateScroll()` on the node and record that — after which
            `measurePageBox` skips the scroll translation for every descendant,
            because a fixed subtree does not move with the page.

            WHY `layout` TOO: `layoutScroll` and `layoutRoot` are only read off
            a projection node, and the layout feature that creates one is gated
            on `layout || layoutId` alone (motion/features/definitions.mjs).
            Without `layout` here both props are silently inert — the header
            never joins the projection tree and nothing changes.

            WHY `layoutRoot`: framer's documented pairing for fixed elements. It
            keeps the header's own layout animation instant, so adding `layout`
            above cannot make the bar itself animate. */}
        <HeaderShell
          isScrolled={isScrolled}
          colorSchema={colorSchema}
          headerRef={headerRef}
          className={className}
        >
          <>
            <div className="flex items-center justify-between h-header">
              {/* Left Section: Mobile Menu + Logo */}
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleMobileMenu}
                  aria-label={t("open_menu")}
                  className={cn(
                    "xl:hidden p-2 rounded-lg transition-colors cursor-pointer",
                    "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Reserved box — see BRAND_BOX. The admin bar swaps logo
                    variants on store rehydration exactly like the user bar.

                    `data-brand-box` so the pinned assistant can collapse the
                    SLOT and not merely its contents: hiding the logo alone left
                    a zero-width box still sitting between two `gap-4`s, which
                    reads as the menu being indented past something invisible. */}
                <div data-brand-box="" className={BRAND_BOX}>
                  <NavbarLogo href="/admin" isInAdmin={true} />
                </div>

                {/*
                  THE LOGO'S OTHER JOB, KEPT WHEN THE LOGO IS NOT.
                  ------------------------------------------------------------
                  `NavbarLogo` above is `href="/admin"` — on this bar the mark is
                  not decoration, it is the way back to the dashboard. Hiding it
                  to buy width for the pinned assistant therefore removed a
                  navigation control, and nothing replaced it.

                  It goes unnoticed on the main admin bar, which carries a
                  Dashboard item in its own menu. Inside an addon it is the whole
                  problem: `/admin/p2p` scopes the menu to P2P, and
                  `shouldShowBackButton` needs `variant="extension"` which an
                  admin addon area is not — so with the logo gone there was no
                  way back to `/admin` at all.

                  Rendered always and shown only while pinned, because CSS cannot
                  add an element: the mirror of the rule that hides the logo, in
                  the same block, so the two can never both be absent. ~40px in
                  place of ~220px, so nearly all of the width is still bought.
                */}
                {/* Not on the dashboard itself. A "go to the dashboard" control
                    on the dashboard is a button that does nothing, and it costs
                    the width the whole exercise was buying. `pathname` is the
                    locale-stripped re-export, so this is `/admin` exactly. */}
                {pathname !== "/admin" && (
                  <Link
                    href="/admin"
                    data-admin-home=""
                    aria-label={t("dashboard")}
                    title={t("dashboard")}
                    className={cn(
                      "hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                      "border-border text-muted-foreground hover:text-foreground hover:border-border-strong hover:bg-muted"
                    )}
                  >
                    <Home className="h-4 w-4" />
                  </Link>
                )}

                {/* Desktop Navigation */}
                <nav data-admin-nav="" className="hidden xl:flex items-center ml-6">
                    <div className="flex items-center gap-0.5">
                      {menuItems.map((item) => {
                        const isActive = isActiveMenu(item);
                        const hasDropdown = !!((item.child && item.child.length > 0) ||
                                           (item.megaMenu && item.megaMenu.length > 0));
                        const isDashboard = item.key === "admin-dashboard";

                        return (
                          <div
                            key={item.key}
                            className="relative"
                            onMouseEnter={() => hasDropdown && handleMenuEnter(item.key)}
                            onMouseLeave={handleMenuLeave}
                          >
                            <NavItem
                              item={item}
                              isActive={isActive}
                              hasDropdown={hasDropdown}
                              isOpen={activeMenu === item.key}
                              getTitle={getTitle}
                              iconOnly={isDashboard}
                              colorSchema={colorSchema}
                              primaryColor={primaryColor}
                              secondaryColor={secondaryColor}
                              gradientStyle={gradientStyle}
                            />

                            {/* Dropdown */}
                            <AnimatePresence>
                              {hasDropdown && activeMenu === item.key && (
                                <MegaDropdown
                                  item={item}
                                  onClose={() => setActiveMenu(null)}
                                  getTitle={getTitle}
                                  colorSchema={colorSchema}
                                  primaryColor={primaryColor}
                                  secondaryColor={secondaryColor}
                                  gradientStyle={gradientStyle}
                                />
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </nav>
              </div>

              {/* Right Section: Search + Controls */}
              <div className="flex items-center gap-2">
                {/* Custom Right Controls */}
                {rightControls}

                {/* Command Palette Trigger */}
                <m.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCommandPaletteOpen(true)}
                  aria-label="Search"
                  /* Hidden while the assistant is pinned — see globals.css. It
                     is the widest control on the bar and the only one whose job
                     survives losing it: ⌘K still opens the palette, and the
                     assistant beside it answers the same "where is…" question in
                     words. */
                  data-command-trigger=""
                  className={cn(
                    "hidden xl:flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-sm transition-all duration-200 cursor-pointer",
                    "border",
                    "bg-surface-2 border-border text-muted-foreground hover:text-foreground hover:border-border-strong hover:bg-muted"
                  )}
                >
                  <Search className="w-4 h-4" />
                  <kbd className={cn(
                    "hidden xl:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
                    "bg-muted text-subtle-foreground"
                  )}>
                    <Command className="w-2.5 h-2.5" />K
                  </kbd>
                </m.button>

                {/* User/Admin Toggle */}
                {showAdminToggle && (
                  <Link href={userEquivalentPath}>
                    <m.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "hidden sm:flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                        "border",
                        "text-muted-foreground hover:text-foreground border-border hover:border-border-strong hover:bg-muted"
                      )}
                    >
                      <User className="w-4 h-4" />
                      {/* The label is dropped while the assistant is pinned —
                          the bar has given 26rem to the panel and this word
                          repeats the glyph beside it. See globals.css. */}
                      <span data-area-switch-label="">{t("user")}</span>
                    </m.button>
                  </Link>
                )}

                {/* Language Selector */}
                <LanguageSelector variant="compact" />

                {/* Theme Toggle */}
                {layoutSwitcherEnabled && (
                  <ThemeToggle isDark={isDark} theme={theme} setTheme={setTheme} />
                )}

                {/* NO WALLET BUTTON HERE, deliberately.
                    The wallet shows the SIGNED-IN PERSON'S OWN balances, which
                    is a user-side concern — nothing an operator does on the
                    admin side starts from their own wallet. The user-side
                    header (below) still carries it, and the "User" switch two
                    controls to the left goes straight there, so it is one click
                    away rather than gone. That buys the nav back a 40px tile
                    plus its gap.

                    THE RULE: user-side controls do not appear in the admin
                    header. Language, theme, notifications and profile stay
                    because they are cross-cutting; the wallet is not. */}

                {/* Operations inbox — admin cluster only.
                    Sits beside the bell because it answers the same class of
                    question ("does something need me?"), and because putting it
                    in the nav as a seventh section cost ~110px of horizontal
                    space to say less than its badge does. */}
                {signedIn && <OperationsInbox />}

                {/* Notifications */}
                {signedIn && <NotificationBell />}

                {/* Auth Controls / Profile.
                    `showBalance={false}` for the same reason the wallet button
                    is absent above: an operator's own balances are a user-side
                    concern. Everything else in the panel - identity, security,
                    appearance, sign out - is cross-cutting and stays. */}
                <ProfileButton user={signedIn} showBalance={false} />
              </div>
            </div>
          </>
        </HeaderShell>

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          menuItems={menuItems}
          getTitle={getTitle}
        />

        {/* Mobile Menu — a drawer that renders nothing while closed, so it does
            not need a breakpoint test to decide whether to exist. */}
        <MobileMenu
          menuItems={menuItems}
          getTitle={getTitle}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          userPath={userEquivalentPath}
        />
      </>
    );
  }

  // Render User/Extension Header - Same premium design as admin
  //
  // The bar's four regions are built HERE, once, and handed to whichever layout
  // the owner picked as ready-made nodes. Everything they close over —
  // `menuItems`, `activeMenu`, `isActiveMenu`, the colour schema, the auth state
  // — is derived above, so a layout can only arrange these nodes. It can never
  // re-derive them, which is what stops the second navbar variant from quietly
  // disagreeing with the first about which nav item is active.
  const mobileTriggerSlot = (
    <button
      onClick={toggleMobileMenu}
      aria-label={t("open_menu")}
      className={cn(
        "p-2 rounded-lg transition-colors cursor-pointer",
        showsDesktopNav && "xl:hidden",
        "hover:bg-muted text-muted-foreground"
      )}
    >
      <Menu className="w-5 h-5" />
    </button>
  );

  const brandSlot = shouldShowBackButton ? (
    <div className="flex items-center gap-3">
      <Link
        href={effectiveBackHref}
        className={cn(
          "flex items-center p-2 rounded-lg transition-colors cursor-pointer",
          "hover:bg-muted"
        )}
      >
        <ChevronLeft className={cn(
          "h-5 w-5",
          "text-muted-foreground"
        )} />
      </Link>
      {/* Reserved box — see BRAND_BOX. */}
      <div className={BRAND_BOX}>
        <NavbarLogo href="/" isInAdmin={isInAdminArea} />
      </div>
    </div>
  ) : (
    /* Reserved box — see BRAND_BOX. This is the one the harness caught: it is
       the only child of the left group tall enough to set the group's height at
       >=560px, so its 40px -> 48px swap WAS the group's 8px growth. */
    <div className={BRAND_BOX}>
      <NavbarLogo href="/" isInAdmin={false} />
    </div>
  );

  // Desktop Navigation - Same premium NavItem design
  const navSlot = (
    <nav className="hidden xl:flex items-center ml-6">
      <div className="flex items-center gap-0.5">
        {menuItems.map((item) => {
          const isActive = isActiveMenu(item);
          const hasDropdown = !!((item.child && item.child.length > 0) ||
                             (item.megaMenu && item.megaMenu.length > 0));

          return (
            <div
              key={item.key}
              className="relative"
              onMouseEnter={() => hasDropdown && handleMenuEnter(item.key)}
              onMouseLeave={handleMenuLeave}
            >
              <NavItem
                item={item}
                isActive={isActive}
                hasDropdown={hasDropdown}
                isOpen={activeMenu === item.key}
                getTitle={getTitle}
                iconOnly={false}
                colorSchema={colorSchema}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                gradientStyle={gradientStyle}
              />

              {/* Dropdown */}
              <AnimatePresence>
                {hasDropdown && activeMenu === item.key && (
                  <MegaDropdown
                    item={item}
                    onClose={() => setActiveMenu(null)}
                    getTitle={getTitle}
                    colorSchema={colorSchema}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    gradientStyle={gradientStyle}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </nav>
  );

  const actionsSlot = (
    <>
      {/* Custom Right Controls */}
      {rightControls}

      {/* Token search — first in the cluster because it is the widest control
          and the one a signed-out visitor uses before anything else. */}
      {showsSearch && <TokenSearch />}

      {/* Admin Toggle */}
      {showAdminToggle && (
        <Link href={userEquivalentPath}>
          <m.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "hidden sm:flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
              "border",
              "text-muted-foreground hover:text-foreground border-border hover:border-border-strong hover:bg-muted"
            )}
          >
            {isInAdminArea ? (
              <>
                <User className="w-4 h-4" />
                <span>{t("user")}</span>
              </>
            ) : (
              <>
                <Settings className="w-4 h-4" />
                <span>{t("admin")}</span>
              </>
            )}
          </m.button>
        </Link>
      )}

      {/* Language Selector */}
      <LanguageSelector variant="compact" />

      {/* Theme Toggle */}
      {layoutSwitcherEnabled && (
        <ThemeToggle isDark={isDark} theme={theme} setTheme={setTheme} />
      )}

      {/* Wallet Button */}
      {signedIn && (
        <WalletPopover>
          <m.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 cursor-pointer",
              "border",
              "text-muted-foreground hover:text-foreground border-border hover:border-border-strong hover:bg-muted"
            )}
          >
            <Wallet className="w-4 h-4" />
          </m.button>
        </WalletPopover>
      )}

      {/* Notifications */}
      {signedIn && <NotificationBell />}

      {/* Auth Controls / Profile.

          `showBalance={false}` because the WALLET BUTTON IS RIGHT THERE, two
          controls to the left, and its popover already gives the total, the
          24h move and a per-type breakdown with wallet counts — more than the
          profile panel's block ever showed. Two balance readouts a thumb's
          width apart, disagreeing for a second whenever one fetch lands before
          the other, is worse than one.

          The terminals keep the block for the mirror-image reason: none of
          them mounts a wallet button (see the note beside this one in the
          admin cluster for why the admin bar has none either), so there the
          panel is the only place those figures exist. */}
      <ProfileButton user={signedIn} showBalance={false} />
    </>
  );

  return (
    <>
      {/* Same three-prop contract as the admin bar above — this header is also
          `position: fixed` and hosts the same shared-layout nav underline, so
          it has the identical scroll-offset bug without them. */}
      <HeaderShell
        isScrolled={isScrolled}
        colorSchema={colorSchema}
        headerRef={headerRef}
        className={className}
      >
        <NavbarLayout
          variant={effectiveNavbarVariant}
          mobileTrigger={mobileTriggerSlot}
          brand={brandSlot}
          nav={navSlot}
          actions={actionsSlot}
        />
      </HeaderShell>

      {/* Mobile Menu — closed drawers render nothing, so no breakpoint gate. */}
      <MobileMenu
        menuItems={menuItems}
        getTitle={getTitle}
        onOpenCommandPalette={() => {}}
        userPath={userEquivalentPath}
      />
    </>
  );
}

// Theme Toggle Component
interface ThemeToggleProps {
  /** Genuinely needed here: it picks the sun vs moon glyph, not a colour. */
  isDark: boolean;
  theme: string | undefined;
  setTheme: (theme: string) => void;
}

function ThemeToggle({ isDark, theme, setTheme }: ThemeToggleProps) {
  return (
    <m.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
        "border",
        "text-muted-foreground hover:text-warning border-border hover:border-border-strong hover:bg-muted"
      )}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <m.div
            key="sun"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-4 h-4" />
          </m.div>
        ) : (
          <m.div
            key="moon"
            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-4 h-4" />
          </m.div>
        )}
      </AnimatePresence>
    </m.button>
  );
}

// Nav Item Component with Color Schema Support
interface NavItemProps {
  item: MenuItem;
  isActive: boolean;
  hasDropdown: boolean;
  isOpen: boolean;
  getTitle: (item: MenuItem) => string;
  iconOnly?: boolean;
  colorSchema?: NavColorSchema;
  primaryColor?: string;
  secondaryColor?: string;
  gradientStyle?: string;
}

function NavItem({
  item,
  isActive,
  hasDropdown,
  isOpen,
  getTitle,
  iconOnly,
  colorSchema,
  primaryColor,
  secondaryColor,
  gradientStyle
}: NavItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Get background classes - use hex colors for text when colorSchema is provided
  const bgClasses = colorSchema
    ? isActive
      ? `${colorSchema.bgActive || ''}`
      : `${colorSchema.bgHover || ''}`
    : isActive
      ? "bg-muted"
      : "hover:bg-muted";

  // Get text color - use inline style for colorSchema to ensure it applies
  const textStyle = colorSchema && primaryColor
    ? isActive
      ? { color: primaryColor }
      : undefined
    : undefined;

  const defaultTextClass = isActive
    ? "text-foreground"
    : "text-muted-foreground hover:text-foreground";

  const content = (
    <m.div
      className={cn(
        "relative flex items-center gap-1.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer group",
        // Tightens up below 2xl, where the nav has to share the bar with the
        // controls — a CSS breakpoint rather than the JS one this used to read,
        // so it is already correct in the server HTML.
        iconOnly ? "p-2.5" : "px-2.5 py-2 2xl:px-3",
        bgClasses,
        !colorSchema && defaultTextClass
      )}
      style={textStyle}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={() => iconOnly && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Icon */}
      {item.icon && (
        <Icon
          icon={item.icon}
          className={cn(
            "w-[18px] h-[18px] transition-colors duration-200 shrink-0",
            colorSchema && isActive && "drop-shadow-sm"
          )}
          style={colorSchema && isActive && primaryColor ? { color: primaryColor } : undefined}
        />
      )}

      {/* Title */}
      {!iconOnly && (
        <span className={cn("whitespace-nowrap", colorSchema && isActive && "font-semibold")}>
          {getTitle(item)}
        </span>
      )}

      {/* Dropdown Indicator */}
      {hasDropdown && !iconOnly && (
        <m.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown
            className="w-3 h-3 transition-colors"
            style={colorSchema && isOpen && primaryColor ? { color: primaryColor } : undefined}
          />
        </m.div>
      )}

      {/* Active Indicator */}
      {isActive && (
        <m.div
          layoutId={colorSchema ? `nav-indicator-${colorSchema.primary}` : "nav-indicator"}
          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
          style={{
            background: colorSchema && gradientStyle
              ? gradientStyle
              : "linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary)), hsl(var(--primary) / 0.5))"
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}

      {/* Tooltip for icon-only items */}
      <AnimatePresence>
        {iconOnly && showTooltip && (
          <m.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50",
              "shadow-lg border",
              "bg-surface-2 border-border text-foreground"
            )}
          >
            {getTitle(item)}
            <div
              className={cn(
                "absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-l border-t",
                "bg-surface-2 border-border"
              )}
            />
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );

  if (hasDropdown) {
    return content;
  }

  return (
    <Link href={item.href || "#"}>
      {content}
    </Link>
  );
}

// Profile Button Component
interface ProfileButtonProps {
  user: any;
  /**
   * BOTH clusters in this file pass false, for two different reasons — the
   * user bar because its wallet button already says more, the admin bar
   * because an operator's own balances are not an admin concern and that bar
   * drops the wallet button for the same reason. Only the chromeless terminals
   * take the default. See THE BALANCE RULE in `profile-menu.tsx`.
   */
  showBalance?: boolean;
}

/**
 * The signed-in profile control for the core header.
 *
 * The PANEL is `ProfileMenuPanel`, shared with `profile-info.tsx` - this
 * component owns the trigger tile and the popover frame only. It used to carry
 * its own 170-line copy of a four-line menu that had drifted into a near
 * duplicate of the other one; see the note at the top of `profile-menu.tsx`.
 */
function ProfileButton({ user, showBalance = true }: ProfileButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape closes it. The panel is a menu, and every other overlay in this
  // header answers Escape; this one used to trap the user into clicking away.
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  if (!user) {
    return <AuthHeaderControls />;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <m.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        data-slot="profile-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 overflow-hidden cursor-pointer",
          "border",
          isOpen
            ? "border-border-strong bg-muted"
            : "border-border hover:border-border-strong"
        )}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn(
            "w-full h-full flex items-center justify-center text-sm font-medium",
            "bg-muted text-foreground"
          )}>
            {getUserInitials(user)}
          </div>
        )}
      </m.button>

      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              // Pinned to the viewport under the breakpoint for the same
              // reason the wallet popover is: at 360px wide an `absolute`
              // panel anchored to a tile 8px from the edge overflows it.
              "fixed sm:absolute top-auto sm:top-full right-2 sm:right-0 mt-2",
              "w-[calc(100vw-16px)] sm:w-[360px] max-w-[360px]",
              "rounded-xl overflow-hidden z-50",
              "border shadow-2xl",
              "bg-popover border-border"
            )}
            style={{ maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}
          >
            <ProfileMenuPanel
              showBalance={showBalance}
              onNavigate={() => setIsOpen(false)}
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Named export for backward compatibility
export { SiteHeader };
