import { JSDOM } from "jsdom";
import createDOMPurify, { type Config as DOMPurifyConfig } from "dompurify";

/**
 * Server-side HTML sanitizer for admin-authored legal/content pages.
 *
 * Why this exists: the shared client `SafeHtml` component can only run DOMPurify
 * in the browser; during SSR it *escapes* the HTML to text, and React never
 * un-escapes a `dangerouslySetInnerHTML` payload after hydration — so legal
 * pages (privacy/terms/about/contact) rendered their raw tags as visible text.
 * Sanitizing here, on the server with a jsdom window, lets these pages emit real,
 * styled HTML in the initial response (no JS required, no hydration flash).
 *
 * Allowlist: legal content is authored by admins through the built-in template
 * wizard, whose output uses the full structural/semantic/SVG vocabulary
 * (`section`, `id`, `svg`, tables, forms, …). We therefore keep DOMPurify's
 * comprehensive default allowlist rather than the builder's strict one, and only
 * forbid the executable/embedding surface. DOMPurify still strips every `on*`
 * handler and `javascript:`/`vbscript:` URL by default.
 *
 * This module is server-only by construction (it imports jsdom); it must never
 * be imported from a client component.
 */

// One jsdom window, reused across requests (constructing one is expensive).
// jsdom ships no types (resolves as `any`), which satisfies DOMPurify's WindowLike.
//
// TWO PURIFIERS, ONE WINDOW. The window is the expensive part and is shared;
// the instances are not, and they must not be. DOMPurify 3 attaches hooks to
// the INSTANCE, so `pagePurifier`'s `@import` strip below would otherwise also
// run for the five legal pages — a policy change nobody asked for, arriving by
// side effect. Two instances make the two policies independent by construction
// rather than by everyone remembering.
const jsdomWindow = new JSDOM("").window;
const purifier = createDOMPurify(jsdomWindow);
const pagePurifier = createDOMPurify(jsdomWindow);

const CONFIG: DOMPurifyConfig = {
  // Executable / embedding surface. Event handlers (on*) and javascript:/data:
  // (non-image) URLs are already dropped by DOMPurify's defaults.
  FORBID_TAGS: ["script", "iframe", "object", "embed", "base"],
  // The template wizard styles everything with Tailwind CLASSES, never inline
  // `style` — so forbidding it costs nothing and removes a CSS-injection surface
  // (e.g. url(javascript:…), fixed-overlay clickjacking).
  FORBID_ATTR: ["style"],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeHtmlServer(dirty: string): string {
  return purifier.sanitize(dirty ?? "", CONFIG) as unknown as string;
}

/* ==========================================================================
   CUSTOM PAGES — a second, deliberately different policy.
   ==========================================================================

   The five pages above are written by the built-in template wizard, which
   styles everything with Tailwind CLASSES and never emits an inline `style`.
   A page an owner ADDS is not like that: it is typed into the rich-text
   editor, or pasted in from somewhere else, and both of those carry inline
   `style` on almost every element. Stripping it there does not harden
   anything an owner did not already control — they are the author — it just
   silently deletes their formatting and gives them no way to find out why.

   So `style` survives here and nowhere else. The executable and embedding
   surface (`script`, `iframe`, `object`, `embed`, `base`) stays forbidden,
   DOMPurify still drops every `on*` handler and `javascript:`/`vbscript:`
   URL by default, and `ALLOW_DATA_ATTR` stays off.
*/
const PAGE_CONFIG: DOMPurifyConfig = {
  FORBID_TAGS: ["script", "iframe", "object", "embed", "base"],
  // NO `FORBID_ATTR`. That single omission is the whole difference from
  // `CONFIG` — see the note above.
  ALLOW_DATA_ATTR: false,
};

/*
 * `@import` is a fetch, and this runs on a page anyone can open.
 *
 * DOMPurify does not parse CSS — a `<style>` block's text is opaque to it —
 * so an `@import url(//somewhere/x.css)` would be an uncontrolled outbound
 * request on every render, and a way to pull styling the sanitizer never saw.
 * A hook is the only place to reach it. Scoped to `pagePurifier`, so the
 * legal pages' policy is unchanged.
 */
pagePurifier.addHook("uponSanitizeElement", (node, data) => {
  if (data.tagName !== "style") return;
  const el = node as unknown as { textContent: string | null };
  el.textContent = stripCssImports(el.textContent ?? "");
});

/** `@import` in any form, up to its terminating `;` or the end of the block. */
function stripCssImports(css: string): string {
  return css.replace(/@import[^;]*(;|$)/gi, "");
}

/**
 * Sanitize an owner-authored page body.
 *
 * WRAPPED IN A `<div>`, AND THAT IS LOAD-BEARING — not tidiness.
 *
 * DOMPurify parses through `DOMParser` and returns `body.innerHTML`. The HTML
 * parser hoists a document-LEADING `<style>` into `<head>`, where it is not
 * part of `body` and is therefore dropped on the way out. Measured on this
 * install:
 *
 *   sanitize("<style>.x{}</style>")          ->  ""            <- gone
 *   sanitize("<p>a</p><style>.x{}</style>")  ->  survives
 *
 * An owner who opens the HTML tab and types their CSS first — which is where
 * anyone would put it — would watch it vanish on save with no error anywhere.
 * The wrapper puts the parser in "in body" mode before the author's first
 * byte, so position stops deciding whether their styling exists.
 *
 * A stray `</div>` in the input closes the wrapper early and the remainder
 * becomes a sibling of it. Still inside `body`, still returned — so the worst
 * case is unchanged output, not lost content.
 */
export function sanitizeCustomPageHtml(dirty: string): string {
  return pagePurifier.sanitize(
    `<div>${dirty ?? ""}</div>`,
    PAGE_CONFIG
  ) as unknown as string;
}

/**
 * Does this sanitized document actually contain anything?
 *
 * IT CANNOT BE `html.trim() === ""`, and that is the whole reason this exists.
 * `sanitizeCustomPageHtml` wraps its input in a `<div>` before parsing (see
 * above), so its output ALWAYS carries that wrapper — a body of
 * `<script>alert(1)</script>`, which sanitizes to nothing at all, comes back as
 * the string `"<div></div>"`, which is not empty and passes a trim test. The
 * visible result was a page that answered 200 and rendered a blank column
 * between the header and the footer, with no way for the owner to tell whether
 * their content had failed to save or failed to survive.
 *
 * So the test is on CONTENT, not on length. Text first; then the elements that
 * are still a page with no text in them — an image, a rule, a table, a chart.
 * Anything else is a document that sanitized away.
 */
export function hasRenderableContent(html: string): boolean {
  if (typeof html !== "string" || !html.trim()) return false;

  /* `&nbsp;` and friends are whitespace to a reader, so a document of nothing
     but entities is still empty. Only the space-like ones are decoded — this
     is an emptiness test, not an unescaper. */
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .trim();
  if (text) return true;

  return /<(img|hr|svg|video|audio|table|canvas|picture|source|iframe|input)\b/i.test(html);
}

/**
 * Sanitize the `customCss` column for emission as a `<style>` text child.
 *
 * The caller MUST render this as a text child (`<style>{css}</style>`) and
 * never through `dangerouslySetInnerHTML`: React escapes a `<style>` text
 * child through a dedicated CSS escaper (`</style>` becomes `</\73 tyle>`, so
 * there is no breakout), and does not escape a dangerously-set one at all.
 * The `</style` strip below is therefore a belt to React's braces, and the
 * `@import` rule is the same one the `<style>` hook applies.
 */
export function sanitizePageCss(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return stripCssImports(raw.replace(/<\/\s*style/gi, "")).trim();
}
