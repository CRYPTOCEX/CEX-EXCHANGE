"use client";

// Providers.tsx
import { useEffect, useMemo, useRef } from "react";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { seedUserStoreFromServer, useUserStore } from "@/store/user";
import { AuthBootProvider, type AuthBoot } from "@/store/auth-boot";
import { BrandBootProvider, type BrandBoot } from "@/store/brand-boot";
import { normalizeLogoDisplay } from "@/lib/brand/logo-display";
import { useConfigStore } from "@/store/config";
import { useThemeStore } from "@/store";
import { WebSocketProvider } from "./websocket.provider";
import { ExtensionChecker } from "@/lib/extensions";
import FloatingChatProvider from "@/components/global/floating-chat-provider";
import AnnouncementBanner from "@/components/global/announcement-banner";
import { useSettingsSync } from "@/hooks/use-settings-sync";
import applyGoogleTranslateDOMPatch from "@/utils/applyGoogleTranslateDOMPatch";
import { LazyMotionProvider } from "@/components/motion";

/* Geist and Geist Mono were declared here too, identically to the root layout,
   and NOTHING referenced either binding — no `className`, no `variable`. They
   were not free: next/font keys its work on the call options, so two identical
   calls are two separate downloads of every subset, and this file doubled the
   Geist half of a cold start for no output at all. The families now live in
   `app/fonts.css`; see the typefaces comment in `app/[locale]/layout.tsx`. */

interface ProvidersProps {
  children: React.ReactNode;
  profile: any;
  settings: any;
  extensions: any;
}

const ConfigInitializer = ({
  profile,
  settings,
  extensions,
}: Omit<ProvidersProps, "children">) => {
  const setUser = useUserStore((state) => state.setUser);
  const { setSettings, setExtensions, setSettingsFetched, setSettingsError } =
    useConfigStore();

  // Use the settings sync hook for optimistic updates
  useSettingsSync();

  /*
   * `setUser(profile)` used to live in the effect below, and that one line was
   * the entire boot-auth defect: an effect runs after hydration and after
   * paint, so every consumer spent the whole boot window being told `user ===
   * null` — indistinguishable from "signed out". The seed now happens during
   * `Providers`' render (client) and through the `AuthBoot` context (server);
   * see `seedUserStoreFromServer` in store/user.ts.
   *
   * What remains here is the RE-sync: the root layout can re-render with a new
   * profile after a `router.refresh()` — a fresh sign-in, a role change, an
   * avatar update — and the store has to follow. `profile` arrives freshly
   * deserialised from the flight payload on every such render, so a plain
   * dependency array would fire on the first render too and undo nothing but
   * waste a render; the ref skips exactly that first pass, the one the seed
   * already handled.
   *
   * This is also strictly safer than the old effect for logout. `logout()` sets
   * `user: null`, but the old dependency array re-ran `setUser(profile)`
   * whenever the prop identity changed — so a re-render carrying a stale flight
   * payload would sign the user straight back in. Comparing identity against
   * what we last applied means a repeat of the same payload is a no-op.
   */
  const lastAppliedProfile = useRef<any>(profile);

  useEffect(() => {
    if (lastAppliedProfile.current !== profile) {
      lastAppliedProfile.current = profile;
      setUser(profile ?? null);
    }
  }, [profile, setUser]);

  useEffect(() => {
    // Only mark as fetched if we actually have settings data
    if (settings && Object.keys(settings).length > 0) {
      setSettings(settings);
      setExtensions(extensions || []);

      // Initialize extension checker with available extensions
      if (extensions && extensions.length > 0) {
        ExtensionChecker.getInstance().initialize(extensions);
      }
    } else {
      // If settings are empty, don't mark as fetched so it will retry
      setSettingsFetched(false);
      setSettingsError(null);
    }
  }, [
    settings,
    extensions,
    setSettings,
    setExtensions,
    setSettingsFetched,
    setSettingsError,
  ]);

  return null;
};

// Add error handler component and DOM patches
function GlobalErrorHandler() {
  useEffect(() => {
    // Apply DOM patches for Google Translate and other third-party tools
    // This prevents "removeChild" errors during locale changes
    applyGoogleTranslateDOMPatch();

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      // Prevent the default browser behavior which might crash the app
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
    };

    // Add global error listeners
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}

/**
 * `useFontClasses` lived here and was never imported by anything.
 *
 * It returned `style: { "--radius": `${radius}rem` }` from the theme store,
 * whose default is `0.5` — while the design system's `--radius` is `0.25rem`.
 * So it was not merely dead, it was a loaded gun: wiring it up would have
 * silently DOUBLED every radius in the app, and because the whole ramp
 * (`--radius-sm` … `--radius-3xl`) is derived from that one value, the effect
 * would have compounded across every card, input and panel at once.
 *
 * Nothing calls `setRadius` either — there is no UI for a runtime radius — so
 * the feature does not exist and the hook only misled. Radius comes from
 * `app/globals.css`; see the ramp note in DESIGN-SYSTEM.md.
 */

const Providers = ({
  children,
  profile,
  settings,
  extensions,
}: ProvidersProps) => {
  /*
   * BOOT-TIME AUTH RESOLUTION — the client half.
   * ==========================================================================
   *
   * This runs DURING RENDER, not in an effect, and it runs here rather than in
   * a child because ordering is the entire point: React renders a parent before
   * its subtree, and `Providers` is the outermost client component in the app
   * (only `ThemeTransition` and `TranslationProvider` sit above it, and neither
   * touches the user store). So by the time any of the 118 `useUserStore`
   * consumers below reads a snapshot — including on the hydration pass, which
   * is where a mismatch would be born — the profile is already in the store.
   *
   * `seedUserStoreFromServer` is a no-op on the server. That guard is what
   * stops one request's profile leaking into another's HTML; the server gets
   * its copy through `AuthBootProvider` below instead. Read the comment on the
   * function before touching either half.
   */
  if (typeof window !== "undefined") {
    seedUserStoreFromServer(profile ?? null);
  }

  /*
   * The same answer, per request, for the server render.
   *
   * `resolved: true` unconditionally — including when `profile` is null. The
   * root layout always runs `getUserProfile()` before it renders, so by the
   * time this component exists the question HAS been asked; a null profile is
   * the answer "guest", not the absence of one. That distinction is the fix.
   *
   * Memoised so the object identity is stable across re-renders: every
   * `useUserStore` call now reads this context, and an unstable value would
   * re-render all of them whenever the root re-rendered.
   */
  const authBoot = useMemo<AuthBoot>(
    () => ({ profile: profile ?? null, resolved: true }),
    [profile]
  );

  /*
   * The brand mark, for the SERVER render and the hydration pass.
   *
   * `settings` is the object the root layout already fetched for this request,
   * so this costs nothing and is exactly what the config store will hold a
   * moment later — which is the point: with the answer available on both sides
   * there is no frame in which the navbar draws the coded default. See
   * `store/brand-boot.ts` for the swap this removes and why it cannot be a
   * write to the config store.
   *
   * Memoised on the VALUE rather than on `settings`, because `settings` arrives
   * freshly deserialised from the flight payload on every layout re-render and
   * an unstable context object would re-render every consumer beneath it.
   */
  const brandBoot = useMemo<BrandBoot>(
    () => ({ logoDisplay: normalizeLogoDisplay(settings?.navbarLogoDisplay) }),
    [settings?.navbarLogoDisplay]
  );

  // Get default theme from settings, fallback to environment variable, then 'system' as last fallback
  const defaultTheme = (
    settings?.siteTheme ||
    process.env.NEXT_PUBLIC_DEFAULT_THEME ||
    "system"
  ) as "light" | "dark" | "system";

  return (
    <AuthBootProvider value={authBoot}>
    <BrandBootProvider value={brandBoot}>
    <ThemeProvider
      attribute="class"
      enableSystem={defaultTheme === "system"}
      defaultTheme={defaultTheme}
      disableTransitionOnChange={true}
    >
      <LazyMotionProvider>
        {/* ONE global tooltip provider. `ui/tooltip.tsx` used to wrap every
            <Tooltip> in its own provider, and 80+ files mounted more on top —
            each nested provider RESETS delayDuration for its subtree, so the
            hover delay was whatever the innermost accidental provider said. */}
        <TooltipProvider>
        <ConfigInitializer
          profile={profile}
          settings={settings}
          extensions={extensions}
        />
        {profile?.id ? (
          <WebSocketProvider userId={profile.id}>
            <div className={cn("h-full")}>{children}</div>
            <FloatingChatProvider />
            {/* Inside the WebSocket provider, and only in this branch: the
                announcement feed arrives on the `/api/user` socket, which only
                exists for a signed-in profile. */}
            <AnnouncementBanner />
          </WebSocketProvider>
        ) : (
          <>
            <div className={cn("h-full")}>{children}</div>
            <FloatingChatProvider />
          </>
        )}
        <Toaster />
        <GlobalErrorHandler />
        </TooltipProvider>
      </LazyMotionProvider>
    </ThemeProvider>
    </BrandBootProvider>
    </AuthBootProvider>
  );
};

export default Providers;
