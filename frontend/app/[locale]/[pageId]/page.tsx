import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Section } from "@/types/builder";
import SiteHeader from "@/components/partials/header/site-header";
import { SiteFooter } from "@/components/partials/footer/user-footer";
import SectionRenderer from "../(dashboard)/admin/builder/components/renderers/section-renderer";
import { readStoredSeo } from "../components/page-seo";
import { getSettings } from "@/lib/fetchers/settings";
import {
  hasRenderableContent,
  sanitizeCustomPageHtml,
  sanitizePageCss,
} from "../(legal)/components/sanitize-html-server";

interface BuilderPageProps {
  /** Next 16 hands route params in as a promise; both exports await it. */
  params: Promise<{ locale: string; pageId: string }>;
}

/**
 * A stored builder page, by id OR slug. Returns `null` for every failure.
 * ============================================================================
 *
 * `/api/content/page/{idOrSlug}` looks up the primary key first and falls back
 * to the slug, and it only ever answers with PUBLISHED rows — so a draft is
 * indistinguishable from a page that does not exist, which is what the
 * anonymous visitor should see either way.
 *
 * IT MUST NEVER THROW. `generateMetadata` runs inside the render pass, so an
 * exception here is not a missing title, it is a 500 on every custom marketing
 * URL on the site. Every path out of this function is a value.
 *
 * THE 200-WITH-AN-ERROR-BODY TRAP. `res.ok` is NOT the test. CORS pins the uWS
 * backend at HTTP 200 and the real code travels in the body, so a missing page
 * arrives as `200 {"message":"Page not found","statusCode":404}` and a backend
 * fault arrives as `200 {"statusCode":500,...}`. Measured on this install,
 * both. The discriminator is therefore the SHAPE — a real row carries `id` —
 * which is the same test `store/pages-store.ts` applies to the same endpoint,
 * including its tolerance for a `{ page }` wrapper.
 *
 * WHY `cache()`, and why it is load-bearing rather than tidy.
 *
 * `generateMetadata` below wants the row's SEO columns and the page body wants
 * its `content`; Next runs both in ONE render pass, so without this the route
 * would ask the backend for the same record twice per request. React's
 * `cache()` is request-scoped memoisation keyed on the argument — here the
 * id/slug — so the second caller never reaches `fetch`. It is not a cache with
 * a lifetime and it cannot serve a stale row, which is the property
 * `lib/fetchers/chrome.ts` and `lib/fetchers/settings.ts` each paid for once
 * already after `next: { revalidate }` made saved edits look like they had not
 * saved.
 *
 * Note where `Date.now()` sits: INSIDE the memoised function. The buster exists
 * to defeat anything caching in front of the backend, and it would defeat
 * Next's own fetch-level dedupe as a side effect because two callers would
 * build two different URLs. `cache()` sits above that, so `Date.now()` is
 * evaluated once per render pass and the buster keeps doing its job without
 * costing a second round trip. Hoisting it out of here would break the memo
 * the moment anything else on the page called this with the same slug.
 */
const fetchBuilderPage = cache(
  async (idOrSlug: string): Promise<Record<string, any> | null> => {
    try {
      /* Same-host internal HTTP port rather than the public HTTPS domain: Node
         rejects an incomplete cert chain with UNABLE_TO_VERIFY_LEAF_SIGNATURE
         even where browsers accept it, and the loopback is faster. Override
         with NEXT_PUBLIC_BACKEND_URL when the backend is on another host. */
      const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
      const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        `http://localhost:${backendPort}`;
      const url = `${baseUrl}/api/content/page/${encodeURIComponent(
        idOrSlug
      )}?_t=${Date.now()}`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;

      const data = await res.json();
      if (data && typeof data === "object") {
        if (data.id) return data as Record<string, any>;
        if (data.page && typeof data.page === "object") {
          return data.page as Record<string, any>;
        }
      }
      return null;
    } catch (error) {
      console.error(`Error loading builder page "${idOrSlug}":`, error);
      return null;
    }
  }
);

/** A blank column is not a value: an owner who clears a box means "unset". */
function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}

/**
 * The stored document's section list, or `[]` if there is not one.
 *
 * TWO STORAGE SHAPES, one of them historical. `content` is normally the JSON
 * document the builder saves; older rows hold that JSON base64-encoded. The
 * sniff is the same one `../components/home-route-client` uses — alphabet plus
 * a length that is a multiple of four — rather than "try `atob` and see", which
 * is what this file used to do: a plain JSON body begins `{`, `atob` rejects it
 * with an InvalidCharacterError, and the catch quietly hands back the original.
 * That worked, and it threw away one exception per page view to learn something
 * a regex answers for free.
 *
 * `Buffer` RATHER THAN `atob`, and this is a correctness change, not a style
 * one. `atob` yields a BINARY string — one char per byte — so any non-ASCII
 * copy in a legacy base64 document (an em dash, a currency symbol, any
 * non-English page) came back mojibake. Decoding through UTF-8 is only
 * available here because this now runs on the server.
 *
 * `null` MEANS "NOT A BUILDER DOCUMENT", and that distinction is now the fork
 * this whole route turns on.
 *
 * This used to return `[]` for both "the builder saved an empty document" and
 * "this body is not builder JSON at all", and the caller 404'd on either. That
 * was fine while every row here WAS a builder document; it is not fine now
 * that an owner can add a page whose body is ordinary HTML, because the second
 * case is no longer an error — it is the other kind of page. So the two
 * answers are separated: `Section[]` (possibly empty) means the content parsed
 * as a builder document, `null` means it did not.
 *
 * NO `console.error` ON THE PARSE FAILURE. It had one, and it was right to:
 * back when every body was JSON, a body that would not parse was a corrupt
 * row worth a line in the log. Now the commonest page on the site takes that
 * branch on every single view, so the same line would be pure noise — one
 * stack trace per request for a page that is working perfectly. `null` carries
 * the meaning to the one caller that asks.
 */
function readBuilderDocument(content: unknown): Section[] | null {
  if (typeof content !== "string" || content.trim() === "") return null;

  let decoded = content;
  if (/^[A-Za-z0-9+/]*={0,2}$/.test(content) && content.length % 4 === 0) {
    try {
      decoded = Buffer.from(content, "base64").toString("utf8");
    } catch {
      decoded = content;
    }
  }

  try {
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed?.sections) ? parsed.sections : null;
  } catch {
    return null;
  }
}

/**
 * `isBuilderPage`, read defensively.
 *
 * Sequelize over MySQL normally hands a `TINYINT(1)` back as a boolean, but
 * rows written through other paths and some driver/dialect combinations yield
 * `1`/`"1"`, and this value decides which RENDERER runs. Guessing wrong in one
 * direction prints raw JSON to visitors; in the other it 404s a live page.
 */
function isFlagTrue(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

/**
 * Every custom page's stored SEO, finally reachable.
 *
 * This route was `"use client"`, and a client page cannot export
 * `generateMetadata` — so every page an owner builds (/pricing, /careers, the
 * whole marketing site) shipped with nothing but the root layout's fallback
 * title, and the `seoTitle` / `seoDescription` / `seoKeywords` columns the
 * builder's SEO tab writes went nowhere. The same defect the home route and the
 * blog post route each had, in the file that covers the most URLs.
 *
 * Order of preference matches the home route: the SEO tab's own fields win,
 * then the page's ordinary title/description. `readStoredSeo` is reused rather
 * than reimplemented — it already resolves the flat/nested split and joins an
 * array of keywords — with `seoKeywords` mapped onto the `keywords` slot it
 * looks for, because the `page` table names that column differently from the
 * default-page documents.
 *
 * Anything still missing is omitted rather than defaulted: a page that returns
 * no title inherits the layout's `title.default`, whereas returning the site
 * name here would be run through the layout's "%s - {site}" template and
 * printed twice.
 */
export async function generateMetadata({
  params,
}: BuilderPageProps): Promise<Metadata> {
  const { pageId } = await params;
  const page = await fetchBuilderPage(pageId);
  if (!page) return {};

  const stored = readStoredSeo({
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    keywords: page.seoKeywords,
  });

  const title = stored.title ?? text(page.title);
  const description = stored.description ?? text(page.description);
  const keywords = stored.keywords;

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(keywords ? { keywords } : {}),
  };
}

/**
 * The CMS catch-all, rendered on the server.
 * ============================================================================
 *
 * This file serves EVERY custom page an owner builds — /pricing, /careers,
 * /partners — so whatever it does at first paint, it does for most of the
 * marketing site.
 *
 * WHAT WAS HERE. A `"use client"` component that resolved its two governing
 * questions in the browser: it read `landingPageType` out of `useConfigStore`
 * (filled from an EFFECT, and effects do not run on the server) and then waited
 * on a `setTimeout(100)` before believing the answer, and it fetched the page
 * document itself from the browser. `plans/SKELETONS.md` calls this shape "the
 * server rendered a different page" and `lib/fetchers/chrome.ts` names THIS
 * file as the instance it was written to avoid. It is the fourth one found.
 *
 * MEASURED, on a published builder page with `landingPageType: CUSTOM`
 * (harness at `--hold 60`, so the photograph lands before the 100ms timer):
 *
 *   static chrome  19 elements -> 4      matched 0
 *   page height    -655px
 *
 * Matched ZERO is the signature. Not "the skeleton was the wrong size" — no
 * element of the first page survived into the second, because the browser tore
 * down the header, the pending band and the footer and built a different tree
 * in their place. Note also what the same route reports at the default
 * `--hold 1200`: `CLS 0.0003, matched 4, +0px`, a flawless pass, because by
 * then the substitution has already happened and both photographs are of the
 * page that replaced it. A late hold cannot see this class of defect.
 *
 * AND IT WAS WORSE THAN LATE — IT NEVER ARRIVED. The `useEffect` that set
 * `frontendType` had a `[]` dependency list, so its closure captured
 * `isFrontendBuilder` from the FIRST render, where `isSettingsLoaded` was still
 * `false` and the expression was therefore `false` by construction. The timer
 * then fired with that stale `false` and called `setFrontendType("default")`,
 * whose only consequence in the next effect is `notFound()`. Every custom page
 * on every install 404'd a tenth of a second after painting, whatever
 * `landingPageType` actually said. That is not a race that a longer timeout
 * fixes; the answer was unreachable. Resolving the setting on the server
 * deletes the closure, the timer and the bug together.
 *
 * NO DOUBLE FETCH, and this route asks for two things.
 *
 *   `fetchBuilderPage` is also called by `generateMetadata` above, for the same
 *   row's SEO columns. `cache()` collapses the two into one request — see its
 *   note for why the `_t=` buster does not defeat that.
 *
 *   `getSettings()` is already called by the locale layout, for `<Providers>`.
 *   It has been `cache()`d since it was written for exactly this reason, so
 *   this is a memo hit rather than a second `/api/settings` request.
 *
 * They are issued together rather than in sequence because neither answer
 * decides whether to ask the other question, and the interesting install — the
 * one with real content — needs both. The cost of the arrangement is one
 * wasted lookup on a DEFAULT install, where this route only ever matches a URL
 * that is about to 404 anyway.
 *
 * NO CLIENT HALF, and no `loading.tsx` either. The home route needed one
 * because `usePagesStore` is a `persist()` store and a returning visitor's
 * first client render legitimately holds a builder document the server could
 * not have had — so that route gates exactly that branch on `hasMounted`. This
 * route never consulted that store; it fetched with a bare `fetch()`. With the
 * fetch moved to the server there is no client-only state left to reconcile, so
 * there is no `isClient` here and nothing to gate.
 *
 * The pending band that used to sit in this file went with it. It existed
 * because the content arrived after the HTML; it now arrives before the HTML,
 * and there is no pending state left to draw. A `loading.tsx` would not bring
 * it back honestly either: `<SiteHeader/>` and `<SiteFooter/>` are rendered by
 * this page rather than by the locale layout, so a faithful one would have to
 * be a second copy of them — the duplicate tree SKELETONS.md's first rule
 * exists to prevent. Without one, a soft navigation holds the previous page on
 * screen until this render resolves, which moves nothing at all.
 */
export default async function BuilderPage({
  params,
}: BuilderPageProps): Promise<React.JSX.Element> {
  const { pageId } = await params;

  const [page, config] = await Promise.all([
    fetchBuilderPage(pageId),
    getSettings(),
  ]);

  /* `getSettings()` returns `settings: Record<string, string>` on the happy
     path and a bare `{}` on each of its failure paths, so its inferred type is
     a union no key can be read off. Widened once, here — and `any` rather than
     `string` because settings are TEXT in the database but arrive already
     coerced for some keys, a distinction `settingsToObject` does not draw. */
  const settings = (config.settings ?? {}) as Record<string, any>;

  /**
   * "OFF" AND "NOT TOLD YET" ARE DIFFERENT ANSWERS, and here the difference
   * decides whether a real page 404s.
   *
   * `getSettings()` answers `{}` when the backend is unreachable, returns a
   * non-2xx or sends a body that will not parse. Collapsing that into the
   * `|| "DEFAULT"` the rest of the codebase uses would be safe on the home
   * route — the worst case there is the built-in homepage instead of the
   * builder one — but on THIS route `DEFAULT` means `notFound()`, so one
   * unlucky settings blip would 404 a live marketing page that the very same
   * render just fetched successfully. That is the failure this whole change
   * exists to remove, wearing different clothes.
   *
   * So the resolution is three-valued and `null` is carried rather than
   * flattened, the way `page.tsx` passes `null` instead of `{}` down to the
   * homepage. `null` does NOT veto below: a page we HAVE is better evidence
   * than a setting we could not read.
   *
   * The known case coerces to the two ids rather than passing the string
   * through, for the same reason `normalizeChrome` coerces: settings are TEXT,
   * an unset key reads as `undefined`, and `config/menu.ts` already resolves
   * this exact key as `settings?.landingPageType || "DEFAULT"`. Anything that
   * is not the literal "CUSTOM" means the platform's built-in front end.
   *
   * The emptiness test matches `../page.tsx` deliberately, so the two routes
   * cannot disagree about whether settings arrived.
   */
  const settingsKnown = Object.keys(settings).length > 0;
  const landingPageType: "CUSTOM" | "DEFAULT" | null = !settingsKnown
    ? null
    : settings.landingPageType === "CUSTOM"
      ? "CUSTOM"
      : "DEFAULT";

  /**
   * EVERY `notFound()` HERE RUNS ON THE SERVER, which is the only place they
   * were ever safe.
   *
   * `notFound()` is not a render decision that a later render can take back: it
   * throws, and the segment swaps in `not-found.tsx` permanently for that
   * navigation. In the client version that made the ordering load-bearing and
   * fragile — every predicate had to carry `!loading`, because `!pageData` is
   * true for the whole of a fetch and firing on it would have 404'd every page
   * on the site before its own data could arrive.
   *
   * On the server there is no such window. Every question is answered from
   * data this function already has, before a byte of HTML is written, so the
   * visitor gets a 404 STATUS with the 404 page rather than a rendered page
   * that turns into one; and the `!loading` guards are gone because there is
   * no longer a state they were guarding against.
   *
   * NO ROW IS THE FIRST TEST, and it moved up here from below. "No row", "the
   * row is a draft" and "the backend said 404" are one answer to a visitor,
   * and nothing further down means anything without a record.
   */
  if (!page) {
    notFound();
  }

  /**
   * WHICH KIND OF PAGE IS THIS — and the two kinds are not interchangeable.
   *
   *   builder document : `Section[]` JSON, drawn by `SectionRenderer`.
   *   custom page      : an HTML body an owner wrote, drawn as HTML.
   *
   * SHAPE DECIDES, THE FLAG ONLY BREAKS TIES. `isBuilderPage` is the honest
   * signal and is what the admin screens filter on, but it is set by the
   * WRITER, and the builder's template-create path can store section JSON on a
   * row whose flag is falsy. Trusting the flag alone would then render a JSON
   * document as HTML and print the raw document to visitors. So a body that
   * parses as a builder document is treated as one whatever the flag says, and
   * the flag is consulted only for the case the shape cannot answer: a builder
   * row whose body is empty or corrupt, which must 404 rather than fall
   * through to the HTML branch and 404 there for a less accurate reason.
   */
  const document = readBuilderDocument(page.content);

  if (document !== null || isFlagTrue(page.isBuilderPage)) {
    /**
     * THE BUILDER FRONT-END GATE, and it now sits INSIDE this branch.
     *
     * It used to guard the whole route, and that was the defect this change
     * exists to fix. `landingPageType` is unset on a stock install and resolves
     * to `DEFAULT`, so the gate 404'd every CMS page on every default install —
     * including, once pages became addable from the Default Pages editor, every
     * page an owner had just created. The two halves were in direct
     * contradiction: `config/menu.ts` shows that editor on exactly the setting
     * this line was refusing to serve its output on.
     *
     * What the gate actually means is "builder pages are reachable only where
     * the owner has opted into the builder front end" — a statement about
     * BUILDER documents, which is where it now lives. An owner-authored HTML
     * page is not a builder page and was never what this was gating.
     *
     * `null` still does not veto: a page we HAVE is better evidence than a
     * setting we could not read.
     */
    if (landingPageType === "DEFAULT") {
      notFound();
    }

    /* A row whose document holds zero sections is the same 404 to a visitor as
       a row that does not exist. */
    if (!document || document.length === 0) {
      notFound();
    }

    return (
      <>
        <SiteHeader />
        <main className="min-h-screen">
          <div className="page-content">
            {document.map((section: Section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                isPreview={true}
              />
            ))}
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  /**
   * A CUSTOM PAGE — an HTML body written in the Default Pages editor.
   *
   * NOT GATED on `landingPageType`; see the note above.
   *
   * Sanitized HERE rather than trusted from the database. The backend does run
   * a regex stripper on the way in, but it is a different and weaker policy
   * than this one, and a row can predate it or arrive by another path. The
   * render is the last place the decision can be made, so it is made here too.
   *
   * `.legal-content` IS THE EDITOR'S OWN CANVAS CLASS, which is the reason to
   * use it here rather than a set of Tailwind classes that merely look similar.
   * It is declared globally in `globals.css` (headings, paragraphs, lists,
   * links, tables, blockquotes, rules, and their dark-mode variants), and
   * `components/ui/wysiwyg/wysiwyg-editor.tsx` puts it on BOTH the
   * contenteditable surface and the preview pane. So the document an owner
   * composes is styled by the same rules that will style it once published —
   * the editor is a real preview instead of an approximation of one.
   *
   * Nothing rewrites the owner's markup to get there. `processContent` in
   * `(legal)/components/default-page.tsx` injects per-tag classes for the five
   * template-authored pages, and its own note records the stray `</p><p>`
   * wrappers and forty spurious `<br />` tags it produced on a document that
   * was hand-written rather than generated. A pasted page is exactly that kind
   * of document, so it is rendered as written.
   */
  const html = sanitizeCustomPageHtml(
    typeof page.content === "string" ? page.content : ""
  );

  /* A body that sanitizes to nothing is a page with no content, which is the
     same 404 as no page — and it is the one outcome the owner cannot see from
     the editor, so it must not render as a blank styled shell either.

     NOT `html.trim()`: the sanitizer wraps its input before parsing, so its
     output always carries that wrapper and an emptied document arrives as the
     non-empty string "<div></div>". `hasRenderableContent` tests the content
     rather than the length. */
  if (!hasRenderableContent(html)) {
    notFound();
  }

  const css = sanitizePageCss(page.customCss);

  return (
    <>
      <SiteHeader />
      {/* `pt-header` is not decoration: `SiteHeader` is FIXED, so without it
          the first heading of every custom page renders underneath the header
          and is unreadable. The builder branch above does not need it because
          its sections carry their own leading band; a plain HTML document has
          nothing to spare. Same clearance the `(legal)` layout gives the five
          built-in pages, so an added page and an existing one sit level. */}
      <main className="min-h-screen pt-header">
        {/* A TEXT CHILD, never `dangerouslySetInnerHTML`. React escapes a
            `<style>` text child through a dedicated CSS escaper — `</style>`
            comes out as `</\73 tyle>`, so a stored `</style><img onerror=…>`
            cannot break out of the block — and does not escape a
            dangerously-set one at all. The two look identical in the source
            and only one of them is safe. */}
        {css ? <style>{css}</style> : null}
        <div className="page-content">
          <div className="container mx-auto max-w-4xl px-4 py-24">
            <article
              className="legal-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
