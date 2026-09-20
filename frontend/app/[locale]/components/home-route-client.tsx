"use client";

/**
 * The home route's client half.
 *
 * Split out of `page.tsx` so that file can be a server component and export
 * `generateMetadata` — a "use client" page cannot, which is why the home page
 * shipped with no metadata of its own and its stored SEO was unreachable even
 * in principle.
 *
 * Both of this component's render decisions now arrive as PROPS, resolved on
 * the server: which homepage to render (`landingPageType`) and what copy the
 * built-in one is made of (`homeDocument`). See `page.tsx` for the measurement
 * that motivated the second one and `showBuilderPage` below for what the first
 * one replaced.
 */

import { useEffect, useState } from "react";
import DefaultHomePage, {
  type LandingStats,
  type PageContent,
} from "../home";
import { SiteFooter } from "@/components/partials/footer/user-footer";
import SiteHeader from "@/components/partials/header/site-header";
import { usePagesStore } from "@/store/pages-store";
import { Section } from "@/types/builder";
import { pageAttributes } from "@/types/builder";
import SectionRenderer from "../(dashboard)/admin/builder/components/renderers/section-renderer";

interface HomeRouteClientProps {
  /**
   * Resolved from `settings.landingPageType` during SSR — never read from the
   * client config store here. "CUSTOM" means the owner has replaced the
   * homepage with a builder document; anything else means the built-in one.
   */
  landingPageType: "CUSTOM" | "DEFAULT";
  /**
   * The stored `home` default-page document, or `null` when there is none (a
   * fresh install) or the backend could not be reached. Typed as the raw JSON
   * the endpoint returns because that is what `fetchDefaultPage` promises; the
   * cast to `PageContent` happens once, at the hand-off below.
   */
  homeDocument: Record<string, any> | null;
  /**
   * `/api/content/landing-stats` as of the server render, or `null` when it
   * could not be reached. Like `homeDocument`, not read here — it is forwarded
   * to `DefaultHomePage`, which seeds its `landingStats` state from it so the
   * sixteen product sections ship with their real copy and figures instead of
   * the pending run. Passed on every install, not just DEFAULT ones: the
   * builder branch below is gated on `hasMounted`, which is false on the
   * server by construction, so a CUSTOM install still server-renders the
   * built-in homepage.
   */
  initialStats: LandingStats | null;
  /**
   * `settings` and `extensions` as of the server render. Passed straight
   * through to `DefaultHomePage`, which derives its sixteen product sections
   * from them — see `PENDING_SECTIONS` in `../home`. Not read here: this
   * component's own decision (`landingPageType`) is already resolved.
   */
  initialSettings: Record<string, any> | null;
  initialExtensions: string[] | null;
}

export default function HomeRouteClient({
  landingPageType,
  homeDocument,
  initialStats,
  initialSettings,
  initialExtensions,
}: HomeRouteClientProps): React.JSX.Element {
  /* `isLoading` is deliberately NOT read. It only ever drove the two spinners
     that used to live here, and subscribing to it re-renders this component
     (and therefore the whole homepage) twice per revalidation for a value
     nothing renders. See `renderBuilderPage` below for why the spinner went. */
  const { pages, currentPage, fetchPages, fetchPageById, error } =
    usePagesStore();
  const [hasMounted, setHasMounted] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  /* The ONLY client-only state left, and it gates the smallest possible thing
     — see `showBuilderPage`. It is not a settings-timing guess (that was the
     old `setTimeout(100)`, now deleted); it is a hydration constraint that
     applies to the builder branch alone. */
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Which homepage renders. Server-resolved, so it is the same on the server,
  // on the first client render and forever after.
  const isFrontendBuilder = landingPageType === "CUSTOM";

  // Fetch pages and home page content when in builder mode
  useEffect(() => {
    if (isFrontendBuilder) {
      const loadHomePage = async () => {
        try {
          setLoadingError(null);
          await fetchPages();

          // Find the home page with better logic
          let homePageFromStore: pageAttributes | undefined = undefined;

          // Wait for pages to be available
          const currentPages = usePagesStore.getState().pages;

          // First, look for a page with isHome flag
          homePageFromStore = currentPages.find((page) => page.isHome === true);

          // If not found, look for a page with slug 'home' or '/'
          if (!homePageFromStore) {
            homePageFromStore = currentPages.find(
              (page) => page.slug === "home" || page.slug === "/"
            );
          }

          // If not found, look for a page with 'frontend' slug
          if (!homePageFromStore) {
            homePageFromStore = currentPages.find(
              (page) => page.slug === "frontend"
            );
          }

          // If still not found, look for the first page with content
          if (!homePageFromStore) {
            homePageFromStore = currentPages.find(
              (page) => page.content && page.content.trim() !== ""
            );
          }

          // If still not found, just use the first page
          if (!homePageFromStore && currentPages.length > 0) {
            homePageFromStore = currentPages[0];
          }

          if (homePageFromStore && homePageFromStore.id !== currentPage?.id) {
            await fetchPageById(homePageFromStore.id);
          }
        } catch (err) {
          console.error("Error in loadHomePage:", err);
          const errorMsg =
            err instanceof Error ? err.message : "Failed to load home page";
          setLoadingError(errorMsg);
        }
      };

      // Use Promise to handle potential unhandled rejections
      loadHomePage().catch((err) => {
        console.error("Unhandled error in loadHomePage:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Unexpected error loading page";
        setLoadingError(errorMsg);
      });
    }
  }, [isFrontendBuilder, currentPage?.id, fetchPages, fetchPageById]);

  // Function to decode and parse page content
  const parsePageContent = (content: string) => {
    if (!content || typeof content !== "string" || content.trim() === "") {
      return null;
    }

    try {
      // If content is base64 encoded, decode it first
      let decodedContent = content;
      try {
        // Check if content looks like base64
        if (
          /^[A-Za-z0-9+/]*={0,2}$/.test(content) &&
          content.length % 4 === 0
        ) {
          decodedContent = atob(content);
        }
      } catch (e) {
        // If base64 decode fails, use content as is
        console.warn("Base64 decode failed, using content as-is:", e);
        decodedContent = content;
      }

      // Try to parse as JSON
      const parsedContent = JSON.parse(decodedContent);
      return parsedContent;
    } catch (error) {
      console.error("Error parsing page content:", error);
      return null;
    }
  };

  /**
   * The platform's own homepage, with the owner's copy already in it.
   *
   * Built once and used at all six sites below — the five builder fallbacks and
   * the non-builder body — because the prop is the same in every one of them
   * and a document this size has no business being re-typed six times.
   *
   * The cast is the single point where the endpoint's untyped JSON becomes
   * `PageContent`. It is honest rather than convenient: `getContent` walks
   * `variables` defensively and returns its `defaultValue` for any path that is
   * missing, so a document that does not match the interface degrades to the
   * built-in copy field by field instead of throwing.
   */
  const builtInHomePage = (
    <DefaultHomePage
      initialContent={homeDocument as PageContent | null}
      initialStats={initialStats}
      initialSettings={initialSettings}
      initialExtensions={initialExtensions}
    />
  );

  /**
   * The builder page body. NO spinner branch, and that removal is the point.
   *
   * `usePagesStore` is a `persist()` store, so `currentPage` — the whole
   * builder document — is already in localStorage and rehydrated
   * SYNCHRONOUSLY before the first client render on every visit after the
   * first. The `if (isLoading) return <spinner>` that used to open this
   * function therefore threw away content it already had: `fetchPages()` sets
   * `isLoading: true` on mount, so returning to the home page blanked a
   * fully-rendered builder page to a 128px spinner for the length of a network
   * round trip, then rebuilt it. Revalidation is not a reason to unmount what
   * is on screen.
   *
   * With the branch gone the persisted document renders immediately and is
   * replaced in place when the fetch lands — same data, no intervening blank.
   */
  const renderBuilderPage = () => {
    // If there's an error in the store, fall back to default
    if (error) {
      console.warn("Store error, falling back to default:", error);
      return builtInHomePage;
    }

    // If no pages or no current page, fall back to default
    if (pages.length === 0 || !currentPage || !currentPage.content) {
      return builtInHomePage;
    }

    // Parse the content
    const parsedContent = parsePageContent(currentPage.content);

    // If parsing fails or no sections, fall back to default
    if (
      !parsedContent ||
      !parsedContent.sections ||
      parsedContent.sections.length === 0
    ) {
      return builtInHomePage;
    }

    // Render each section using SectionRenderer
    try {
      return (
        <div className="w-full">
          {parsedContent.sections.map((section: Section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              isPreview={true}
            />
          ))}
        </div>
      );
    } catch (renderError) {
      console.error("Error rendering sections:", renderError);
      return builtInHomePage;
    }
  };

  /**
   * ONE root, in every state — and the settings gate is now GONE.
   * ==========================================================================
   *
   * WHAT WAS HERE, IN TWO PASSES
   *
   * Originally: `if (!isClient || !isSettingsLoaded)` returned a `min-h-screen`
   * flex box containing a 128x128 spinner and nothing else — no `<SiteHeader/>`,
   * no `<SiteFooter/>`, not even the `<main>` element. That branch was taken on
   * the SERVER, so the HTML shipped for the most-visited URL on the site was a
   * spinner, and it was taken again for the whole of the client's first 100ms
   * because `isSettingsLoaded` was nothing but a `setTimeout(100)`. When it
   * flipped, the browser tore down a full-viewport div and built the header,
   * the entire homepage and the footer in its place.
   *
   * The first pass deleted the spinner and rendered `DefaultHomePage` during
   * the unknown window, which left the tree correct but the DECISION still
   * client-side. Its closing note read: "THE REAL FIX, when someone takes it:
   * resolve `landingPageType` on the server the way `lib/fetchers/chrome.ts`
   * resolves the navbar variant, pass it in as a prop, and delete
   * `isClient`/`isSettingsLoaded` outright."
   *
   * THAT IS DONE. `page.tsx` reads the setting through `getSettings()` — the
   * same request-deduped server fetcher the locale layout already calls — and
   * hands it down as `landingPageType`. `isSettingsLoaded` and its
   * `setTimeout(100)` are deleted; there is no window in which this component
   * does not know which homepage it is rendering, on the server or on the
   * client.
   *
   * WHY `hasMounted` SURVIVED, WHEN `isClient` DID NOT
   *
   * It is a different question wearing the same clothes, and it is the reason
   * "delete both" was not quite right.
   *
   * `usePagesStore` is a `persist()` store over `localStorage`, and it
   * partializes `pages` and `currentPage` — the whole builder document. That
   * rehydrates SYNCHRONOUSLY, during store creation, so on a CUSTOM install a
   * returning visitor's FIRST client render legitimately has content the server
   * could not have had. Rendering `renderBuilderPage()` unguarded would make
   * the server emit the fallback and the client emit sections in the same
   * render — a hydration mismatch on the whole page body, which React resolves
   * by throwing the server HTML away.
   *
   * So the gate is kept, and per SKELETONS.md's rule ("a gate on client-only
   * state must gate the smallest possible thing") it now gates ONLY the builder
   * branch. A DEFAULT install — every install that has not opted into the
   * builder, and the one this route is measured on — never consults it: server
   * HTML, first client paint and settled state are the same tree, with the
   * owner's own copy in all three.
   *
   * A CUSTOM install still crosses over once, exactly as before: from real
   * content under real chrome, not from a blank viewport. Closing that last
   * crossing means server-rendering the builder document itself AND making the
   * persisted store defer to it, which is a change to `store/pages-store.ts`,
   * not to this file.
   *
   * `loadingError` folds into the same expression: its branch was a verbatim
   * copy of the non-builder body, so it never needed a `return` of its own.
   */
  const showBuilderPage = isFrontendBuilder && hasMounted && !loadingError;

  return (
    <main>
      <SiteHeader />
      {showBuilderPage ? renderBuilderPage() : builtInHomePage}
      <SiteFooter />
    </main>
  );
}
