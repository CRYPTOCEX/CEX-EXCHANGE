import DOMPurify from "isomorphic-dompurify";

/**
 * HTML SANITISATION, ON BOTH SIDES OF THE RENDER.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS WRONG
 * ---------------------------------------------------------------------------
 * Both functions here used to run DOMPurify only when `window` existed and
 * return the input UNCHANGED otherwise, with a comment saying it "will be
 * sanitized on client hydration". It is not, and it cannot be.
 *
 * Every caller feeds the result to `dangerouslySetInnerHTML`, and every caller
 * is a `"use client"` component — which in the App Router still SERVER-RENDERS
 * on the first request. So the unsanitised string went into the HTML document
 * the browser parses. React does not re-hydrate the contents of
 * `dangerouslySetInnerHTML`, so the client pass never got a chance to correct
 * it, and an `<img onerror>` or an injected `<script>` had already run.
 *
 * The content is operator-authored — FAQ answers, announcements, legal
 * templates — so this was an escalation from "can write help content" to "can
 * run script in any reader's session", including an administrator's.
 *
 * ---------------------------------------------------------------------------
 * WHY isomorphic-dompurify AND NOT dompurify + jsdom BY HAND
 * ---------------------------------------------------------------------------
 * DOMPurify needs a DOM, and on the server that means jsdom. Wiring it here
 * directly would mean a conditional `require("jsdom")` inside a module that is
 * in BOTH bundles — this file is imported by client components, which are
 * compiled for the browser as well as the server. A bundler follows that
 * require statically and pulls jsdom into the client bundle, where it is both
 * useless and enormous.
 *
 * `isomorphic-dompurify` exists to make exactly that decision internally: the
 * browser build is plain DOMPurify, the Node build brings its own DOM. Both are
 * listed in `serverExternalPackages` in next.config.js so Next leaves them to
 * Node rather than trying to bundle them.
 *
 * (The plain `dompurify` CJS entry additionally throws on `require` in Node —
 * it self-invokes its factory at module scope and dereferences `window` — so
 * the hand-rolled route is not merely awkward, it does not work.)
 *
 * ---------------------------------------------------------------------------
 * THE ALLOWANCES ARE UNCHANGED
 * ---------------------------------------------------------------------------
 * Deliberately. This is a fix to WHERE sanitisation happens, not to what is
 * permitted — narrowing the tag list at the same time would change what
 * existing operator content renders as, and that belongs in its own change
 * where somebody can look at the content first.
 *
 * Note the native app gets a stricter treatment on the server, in
 * `backend/src/utils/mobile-html.ts`: `<iframe>` and `<a href>` are removed
 * there for store-policy reasons that do not apply to the web.
 */

/** The rich-text allowance: what a WYSIWYG can legitimately produce. */
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "span", "div", "a", "strong", "em", "u", "s",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "code", "pre",
    "table", "thead", "tbody", "tr", "th", "td",
    "img", "video", "iframe",
  ],
  ALLOWED_ATTR: [
    "href", "target", "rel", "class", "id", "style",
    "src", "alt", "width", "height", "title",
    "frameborder", "allowfullscreen",
  ],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

/** The stricter allowance, for previews and one-line summaries. */
const PREVIEW_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "span", "strong", "em", "a"],
  ALLOWED_ATTR: ["href", "target", "rel"],
  KEEP_CONTENT: true,
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

/**
 * Sanitizes HTML content to prevent XSS attacks.
 *
 * Safe on the server and in the browser — see the note above.
 *
 * @param dirty - The HTML string to sanitize
 * @returns Sanitized HTML string, safe for `dangerouslySetInnerHTML`
 */
export function sanitizeHTML(dirty: string): string {
  if (typeof dirty !== "string" || dirty.length === 0) return "";
  return DOMPurify.sanitize(dirty, RICH_TEXT_CONFIG);
}

/**
 * Sanitizes HTML for preview/display with stricter rules.
 *
 * @param dirty - The HTML string to sanitize
 * @returns Sanitized HTML string with limited tags
 */
export function sanitizeHTMLPreview(dirty: string): string {
  if (typeof dirty !== "string" || dirty.length === 0) return "";
  return DOMPurify.sanitize(dirty, PREVIEW_CONFIG);
}
