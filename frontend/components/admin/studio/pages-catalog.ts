/**
 * What the five built-in pages ARE, as far as this admin is concerned.
 * ============================================================================
 *
 * The list endpoint returns a catalogue of five hardcoded entries — they are
 * built-in ROUTES, not rows somebody created, so that is correct. What it
 * cannot tell us is anything about how each one is edited, and that is what
 * decides the whole screen: `home` is a structured document with nine editable
 * bands, the other four are one HTML body.
 *
 * So the shape lives here rather than being re-derived from `pageId === "home"`
 * at each call site. It was derived that way in four different files and they
 * had already begun to disagree — the standalone preview route accepted
 * `home-builder`, which the backend rejects, and the editor accepted alias ids
 * like `privacy-policy` that the backend also rejects.
 */

import { FileText, Home, Phone, Shield, Users, type LucideIcon } from "lucide-react";

export type PageCategoryId = "main" | "information" | "legal" | "custom";

export interface PageCatalogEntry {
  id: string;
  icon: LucideIcon;
  category: PageCategoryId;
  /** The public route, for the preview frame and the "open live" link. */
  publicPath: string;
  /**
   * `variables` — a structured document with a section rail.
   * `content`   — one HTML body edited in the rich-text editor.
   */
  kind: "variables" | "content";
}

export const PAGE_CATALOG: Record<string, PageCatalogEntry> = {
  home: { id: "home", icon: Home, category: "main", publicPath: "/", kind: "variables" },
  about: { id: "about", icon: Users, category: "information", publicPath: "/about", kind: "content" },
  contact: { id: "contact", icon: Phone, category: "information", publicPath: "/contact", kind: "content" },
  privacy: { id: "privacy", icon: Shield, category: "legal", publicPath: "/privacy", kind: "content" },
  terms: { id: "terms", icon: FileText, category: "legal", publicPath: "/terms", kind: "content" },
};

export const PAGE_CATEGORY_LABEL: Record<PageCategoryId, string> = {
  main: "Main",
  information: "Information",
  legal: "Legal",
  custom: "Added",
};

/**
 * An id the build does not know about still has to render.
 *
 * The catalogue and the endpoint are two independently-shipped lists, and the
 * failure mode of assuming they agree is a blank row or a crash on a page an
 * owner can see in the list. `content` is the safe default: it is what four of
 * the five are, and the rich-text editor can hold any body.
 */
export function catalogFor(pageId: string): PageCatalogEntry {
  return (
    PAGE_CATALOG[pageId] ?? {
      id: pageId,
      icon: FileText,
      category: "information",
      publicPath: `/${pageId}`,
      kind: "content",
    }
  );
}

export interface AdminPage {
  /**
   * One of the five built-in ids, OR a CMS row's uuid for a page the owner
   * added. A uuid cannot collide with `home|about|privacy|terms|contact`, so
   * one field addresses both kinds and `/admin/default-editor/{id}/edit`
   * needs no second parameter to know which it is holding.
   */
  id: string;
  name: string;
  description: string;
  path: string;
  status: string;
  /** ISO, or null when the page has never been edited. */
  lastModified: string | null;
  type?: string;
  /** `"default"` for the five built-ins, `"custom"` for an added page. */
  pageSource?: string;
  /** Added pages only — the slug the row is stored under. */
  slug?: string;
  /**
   * The public URL. AUTHORITATIVE when present, because `catalogFor()` cannot
   * derive it for an added page: it would answer `/{uuid}`, which is not a
   * route. Read it through `publicPathFor`, never directly.
   */
  publicPath?: string;
  /** Added pages only; the five built-ins get theirs from `PAGE_CATALOG`. */
  category?: PageCategoryId;
}

/**
 * The page's public URL, without guessing.
 *
 * `catalogFor(id).publicPath` falls back to `/${id}` for an unknown id, which
 * is right for a page id and WRONG for a row uuid — it would send the preview
 * frame and the "open live" link to `/8f3c…`, a URL that 404s. An added page
 * carries its own answer; the five built-ins do not need to.
 */
export function publicPathFor(page: AdminPage): string {
  return page.publicPath ?? catalogFor(page.id).publicPath;
}

/** Same split as `publicPathFor`: the row knows, or the catalogue does. */
export function categoryFor(page: AdminPage): PageCategoryId {
  return page.category ?? catalogFor(page.id).category;
}

/** Is this one of the five compiled-in pages, or a row somebody created? */
export function isBuiltInPageId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(PAGE_CATALOG, id);
}

/**
 * A CMS `page` row as this screen sees it.
 *
 * Shared with the create dialog rather than derived at each call site, because
 * the two mappings that are easy to get wrong are both here:
 *
 *  - THE PATH COMES FROM THE SLUG, never from `row.path`. The model's
 *    `beforeSave` only fills `path` when it is empty, so a row whose slug was
 *    renamed keeps its ORIGINAL path forever. Reading it would show the owner
 *    a URL that no longer serves the page.
 *  - THE STATUS VOCABULARY IS TRANSLATED HERE. The CMS table speaks
 *    `PUBLISHED`/`DRAFT`; every screen above this line speaks `active`/`draft`
 *    (see the status control in `page-editor-studio.tsx` and the badge in
 *    `pages-list.tsx`). Converting at the boundary keeps exactly one
 *    vocabulary above it.
 */
export function cmsRowToAdminPage(row: Record<string, any>): AdminPage {
  const slug = String(row?.slug ?? "").replace(/^\/+/, "");
  const updatedAt = row?.updatedAt ?? row?.createdAt;

  return {
    id: String(row?.id ?? ""),
    name: String(row?.title || slug || "Untitled page"),
    description:
      String(row?.description ?? "").trim() || `A page you added at /${slug}`,
    path: `/${slug}`,
    status: String(row?.status ?? "").toUpperCase() === "PUBLISHED" ? "active" : "draft",
    lastModified: typeof updatedAt === "string" ? updatedAt : null,
    type: "page",
    pageSource: "custom",
    slug,
    publicPath: `/${slug}`,
    category: "custom",
  };
}

/**
 * A title, as a URL slug.
 *
 * NO `/`, even though the column's own pattern (`^[a-z0-9-_/]+$`) permits one.
 * A page is served by `app/[locale]/[pageId]`, which is a SINGLE dynamic
 * segment and not a catch-all, so `guides/fees` matches nothing: the row saves,
 * the editor reports success, and the URL 404s forever with no error anywhere
 * to follow. Rejecting the character is the only place that is visible.
 *
 * Returns `""` for a title with no Latin letters or digits — a Chinese or
 * Arabic title has no transliteration here. The caller must treat that as
 * "ask the owner", not as a slug.
 */
export function slugifyTitle(title: string): string {
  return trimSeparators(normalizeSlugInput(title));
}

/**
 * The same alphabet, for a field somebody is TYPING INTO.
 *
 * It must not trim the trailing separator, and that is the whole reason it is
 * a second function. `slugifyTitle` is applied to a finished string; used as an
 * `onChange` transform on a controlled input it deletes the hyphen on the very
 * keystroke that enters it, so the character can never be typed at all —
 * "how-it-works" arrives as "howitworks", one swallowed hyphen at a time, and
 * the field looks broken with nothing explaining it.
 *
 * LEADING separators are still dropped: they cannot be the start of anything
 * valid, and a slug is trimmed at both ends before it is sent.
 */
export function normalizeSlugInput(value: string): string {
  return String(value ?? "")
    .normalize("NFKD")
    // Strip the combining marks NFKD just split off: "Fees" + U+0301 must
    // become "fees", not "fe-es", which is what the alphanumeric pass below
    // would make of a mark it did not recognise. `\p{M}` rather than a
    // literal U+0300-U+036F range, which is invisible in a diff.
    .replace(/\p{M}/gu, "")
    // Before the alphanumeric pass, not after: that pass matches lowercase
    // only, so an uppercase title would otherwise have every letter replaced
    // with a hyphen and "Fees" would slugify to "".
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 255);
}

/** Both ends. Apply when the value is finished — on submit, not per keystroke. */
export function trimSeparators(slug: string): string {
  return String(slug ?? "").replace(/^-+|-+$/g, "");
}

/**
 * "Never edited" is a real and common state, and it is NOT "a long time ago".
 *
 * The list endpoint used to fabricate this — `Date.now() - 2h`, `- 1d`, `- 3d`
 * per page, computed at request time — so every page claimed to have been
 * edited recently, forever, including on an install where nobody had ever
 * opened the editor. Now it is either the row's real `updatedAt` or nothing.
 */
export function formatEdited(iso: string | null | undefined): string {
  if (!iso) return "Never edited";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Never edited";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString();
}

export function matchesPageQuery(page: AdminPage, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    page.name.toLowerCase().includes(q) ||
    page.id.toLowerCase().includes(q) ||
    page.description.toLowerCase().includes(q) ||
    page.path.toLowerCase().includes(q)
  );
}
