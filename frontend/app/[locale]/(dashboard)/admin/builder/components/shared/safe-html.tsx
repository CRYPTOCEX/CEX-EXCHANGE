"use client";

import React, { useMemo } from "react";
import DOMPurify, { type Config as DOMPurifyConfig } from "dompurify";
import type { JSX } from "react/jsx-runtime";

/**
 * Shared DOMPurify configuration for the page builder's renderer components.
 *
 * Allowed tags cover standard HTML formatting needed by the text/heading/list/
 * quote/link/button/table elements. All `on*` event handlers and
 * `script`/`iframe`/`object`/`embed` tags are stripped. `javascript:` URLs are
 * blocked, and `data:` URLs are only permitted for images.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "a",
  "ul",
  "ol",
  "li",
  "span",
  "code",
  "blockquote",
  "img",
  "div",
  "table",
  "tr",
  "td",
  "th",
  // Extras that are implied by the element semantics:
  "thead",
  "tbody",
  "tfoot",
  "u",
  "s",
  "b",
  "i",
  // ------------------------------------------------------------------
  // Added 2026-07-30. The list above predates this component being used
  // to render `components/ui/wysiwyg` output (blog posts, FAQ answers,
  // staking pool descriptions), and it did not cover what that editor can
  // actually produce. Anything missing here is not merely unstyled — with
  // KEEP_CONTENT the tag is DELETED and only its text survives, so:
  //
  //   figure/figcaption  every inserted image is wrapped in
  //                      `<figure class="wysiwyg-image" style="width:…">`;
  //                      dropping it discarded the size and centring the
  //                      author chose, and un-hid the empty caption.
  //   hr                 the "Divider" slash-command emits <hr> via
  //                      execCommand("insertHorizontalRule"). A void element
  //                      has no text content, so a divider vanished outright.
  //   pre                the editor styles code blocks as <pre>; without it a
  //                      code block collapsed into the surrounding paragraph,
  //                      losing its line breaks entirely.
  //   caption/colgroup/col  emitted by table paste from Word/Docs/Sheets.
  //
  // The rest are ordinary inline semantics an author can reach through the
  // toolbar or by pasting; none of them can execute anything.
  // ------------------------------------------------------------------
  "figure",
  "figcaption",
  "hr",
  "pre",
  "caption",
  "colgroup",
  "col",
  "del",
  "ins",
  "mark",
  "small",
  "sub",
  "sup",
  "abbr",
  "cite",
  "q",
  "dl",
  "dt",
  "dd",
  "picture",
  "source",
  "wbr",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "class",
  "style",
  // Added 2026-07-30 alongside the tags above. `colspan`/`rowspan` are the
  // load-bearing ones: without them a pasted table with any merged cell
  // re-flowed into the wrong shape rather than failing visibly. `width`/
  // `height` let an <img> reserve its box before it loads (no layout shift),
  // and `id` is what an in-page "jump to section" anchor targets — the legal
  // template wizard emits those.
  "title",
  "width",
  "height",
  "colspan",
  "rowspan",
  "span",
  "id",
  "lang",
  "dir",
  "start",
  "reversed",
  "type",
  "value",
  "cite",
  "datetime",
  "loading",
  "decoding",
  "srcset",
  "sizes",
  "media",
];

// Allow http(s), mailto, tel, and data:image/* only. This regex is consulted
// for any URI-bearing attribute (href/src/etc.) after DOMPurify's built-in
// javascript:/vbscript:/etc. blocking.
const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel):|data:image\/(?:png|jpe?g|gif|webp|svg\+xml|avif);|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i;

const PURIFY_CONFIG: DOMPurifyConfig = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  FORBID_TAGS: ["script", "iframe", "object", "embed", "style", "base", "form"],
  // Event-handler attributes (onclick, onerror, onload, ...) are dropped by
  // DOMPurify by default, but being explicit here documents intent.
  FORBID_ATTR: [
    "onerror",
    "onload",
    "onclick",
    "onmouseover",
    "onmouseout",
    "onfocus",
    "onblur",
    "onchange",
    "oninput",
    "onsubmit",
    "onkeydown",
    "onkeypress",
    "onkeyup",
    "onabort",
    "onanimationend",
    "onanimationstart",
    "ondblclick",
    "ondrag",
    "ondrop",
    "onscroll",
    "ontransitionend",
    "onwheel",
  ],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP,
  // Return a string (default) and keep text content even when tags are stripped.
  KEEP_CONTENT: true,
};

/**
 * Minimal HTML-entity escaper used as an SSR fallback when DOMPurify cannot
 * execute (no `window`/DOM available). We deliberately do NOT emit raw HTML on
 * the server — returning an escaped string guarantees no XSS payload can
 * survive even if it reaches the initial HTML before client hydration. The
 * client effect (React's reconciliation) will replace this with the properly
 * sanitized markup as soon as hydration runs.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined" || typeof DOMPurify.sanitize !== "function") {
    return escapeHtml(dirty ?? "");
  }
  return DOMPurify.sanitize(dirty ?? "", PURIFY_CONFIG) as unknown as string;
}

export interface SafeHtmlProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "dangerouslySetInnerHTML" | "children"> {
  html: string;
  tag?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SafeHtml renders trusted-looking HTML strings coming from the page builder
 * through DOMPurify before inserting them into the DOM. Exactly one
 * `dangerouslySetInnerHTML` call remains in the codebase (here), and it only
 * ever receives sanitized output.
 */
export function SafeHtml({
  html,
  tag = "div",
  ...rest
}: SafeHtmlProps): JSX.Element {
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);

  const Tag = tag as keyof JSX.IntrinsicElements;

  return React.createElement(Tag, {
    ...rest,
    dangerouslySetInnerHTML: { __html: sanitized },
  });
}

SafeHtml.displayName = "SafeHtml";
