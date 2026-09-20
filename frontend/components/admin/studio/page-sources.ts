"use client";

/**
 * Where a page in the Pages studio actually LIVES, and how to read and write it.
 * ============================================================================
 *
 * The studio now lists two kinds of page that look identical on screen and are
 * stored nothing like each other:
 *
 *   "default"  the five built-in pages — home, about, privacy, terms, contact.
 *              Rows in `default_pages`, keyed by a fixed `pageId` + `pageSource`,
 *              served by compiled frontend routes that exist whether or not
 *              anyone has ever edited them. Read and written through
 *              `/api/admin/default-editor`.
 *
 *   "custom"   a page the owner ADDED. A row in the CMS `page` table, keyed by
 *              a uuid, addressed by a slug, served by the `[locale]/[pageId]`
 *              catch-all only while it is PUBLISHED. Read and written through
 *              `/api/admin/content/page`.
 *
 * WHY ADAPTERS RATHER THAN A SECOND HOOK. `usePageDraft`'s value is not its
 * fetching — that is four lines — it is the baseline it holds, the `dirty`
 * comparison against it, and its refusal to save a document it did not
 * successfully load. That last rule is the one this editor exists with: its
 * predecessor fell back to a hardcoded stub on a failed load and one Save put
 * the stub over the real page. A second hook would be a second place for that
 * rule to live, and the two would drift the first time one was touched. So
 * there is one hook, and the part that differs — two endpoints, two payload
 * shapes, two status vocabularies — is behind this interface.
 */

import { $fetch } from "@/lib/api";
import {
  isBuiltInPageId,
  trimSeparators,
} from "@/components/admin/studio/pages-catalog";

export interface PageRecord {
  id: string;
  pageId: string;
  type: "variables" | "content";
  title: string;
  variables?: Record<string, unknown> | null;
  content?: string | null;
  meta?: Record<string, unknown> | null;
  status: string;
  lastModified: string;
  pageSource?: string;
  /** The server telling us it could not read the real row. Never editable. */
  isFallback?: boolean;
  fallbackReason?: string;

  /* ---- added pages only ---------------------------------------------- */

  /** The slug the row is stored under, and the page's URL. Editable. */
  slug?: string;
  /**
   * Page-scoped CSS, emitted as a `<style>` element by the public renderer.
   *
   * Editable only for an added page. The request schema used to cap this at
   * 255 characters — `baseStringSchema`'s unstated default, against a
   * `LONGTEXT` column — which made the field a trap rather than a control; it
   * now states its own 64KB limit.
   */
  customCss?: string;
  /**
   * The public URL. Carried rather than derived because the catalogue cannot
   * derive it for a uuid — see `publicPathFor` in `pages-catalog.ts`.
   */
  publicPath?: string;
  /**
   * Which store this record came from.
   *
   * SEPARATE FROM `pageSource`, which is NOT a synonym. `pageSource` carries
   * `"default" | "builder"` — the `default_pages` table's own column, echoed
   * back on every default-editor PUT — and overloading it with a third value
   * would send a word that table's unique key has never held.
   */
  sourceKind?: PageSourceKind;
}

export type PageSourceKind = "default" | "custom";

export interface PageSourceAdapter {
  kind: PageSourceKind;
  /**
   * Does the write endpoint actually honour an optimistic-concurrency
   * precondition? `false` means "do not send one" — see the note on the CMS
   * adapter's `save` for why sending it anyway would be worse than not.
   */
  supportsPrecondition: boolean;
  load(): Promise<{ data: PageRecord | null; error: string | null }>;
  save(
    draft: PageRecord,
    saved: PageRecord | null
  ): Promise<{
    lastModified?: string;
    /**
     * The record as the server actually stored it, when the endpoint echoes it
     * back. Present only where the write path can CHANGE what it was given —
     * the CMS route sanitizes `content` server-side — so the editor can show
     * the stored document rather than the one it hoped it sent.
     */
    stored?: PageRecord;
    error: string | null;
  }>;
  /** Added pages only. The five built-ins are routes and cannot be deleted. */
  remove?(): Promise<{ error: string | null }>;
}

/* ==========================================================================
   Status: two vocabularies, translated once.
   ========================================================================== */

/**
 * The CMS table speaks `PUBLISHED`/`DRAFT`; every screen above this file
 * speaks `active`/`draft` — the status `<select>` in the editor, the badge in
 * `pages-list.tsx`, the row rendering in `pages-studio.tsx`. Converting at
 * this boundary is what lets all three keep working untouched.
 */
export function toStudioStatus(value: unknown): string {
  return String(value ?? "").toUpperCase() === "PUBLISHED" ? "active" : "draft";
}

export function toCmsStatus(value: unknown): "PUBLISHED" | "DRAFT" {
  return value === "active" ? "PUBLISHED" : "DRAFT";
}

/** `"a, b"` -> `["a","b"]`. The SEO panel reads either but writes an array. */
function splitKeywords(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function joinKeywords(value: unknown): string {
  return (Array.isArray(value) ? value.map(String) : splitKeywords(value)).join(", ");
}

/**
 * The AJV caps on `/api/admin/content/page`.
 *
 * These are NOT the column widths — the columns are far wider — they are
 * `baseStringSchema`'s defaults on the request schema, and exceeding one is a
 * 400 whose message names a field the owner may not have touched. Truncating
 * here keeps a save from failing on a field the editor filled in by itself.
 */
const CAP = {
  title: 255,
  slug: 255,
  seoTitle: 255,
  seoDescription: 500,
  seoKeywords: 1000,
  customCss: 65535,
};

const clamp = (value: unknown, max: number): string => String(value ?? "").slice(0, max);

/* ==========================================================================
   The CMS row <-> PageRecord mapping.
   ========================================================================== */

export function cmsRowToPageRecord(row: Record<string, any>): PageRecord {
  const slug = String(row?.slug ?? "").replace(/^\/+/, "");
  const meta = {
    seoTitle: row?.seoTitle ?? "",
    seoDescription: row?.seoDescription ?? "",
    keywords: splitKeywords(row?.seoKeywords),
  };

  return {
    id: String(row?.id ?? ""),
    /* `pageId` too: the editor prints it, the route carries it, and for an
       added page the row's uuid IS its identity. */
    pageId: String(row?.id ?? ""),
    type: "content",
    title: String(row?.title ?? ""),
    variables: null,
    content: typeof row?.content === "string" ? row.content : "",
    customCss: typeof row?.customCss === "string" ? row.customCss : "",
    meta,
    status: toStudioStatus(row?.status),
    lastModified: String(row?.updatedAt ?? row?.createdAt ?? ""),
    slug,
    /* FROM THE SLUG, NEVER FROM `row.path`. The model's `beforeSave` only
       derives `path` when it is empty, so a row whose slug was renamed keeps
       its original path for ever — and showing that would point the preview
       frame and the "open live" link at a URL that no longer serves this
       page. */
    publicPath: `/${slug}`,
    sourceKind: "custom",
  };
}

/**
 * A row's shape, not a status code, is how we know we got a row.
 *
 * The uWS backend answers HTTP 200 with `{"statusCode":404}` in the BODY, so
 * `$fetch` reports no error for a page that does not exist. A real record
 * carries `id`; nothing else here does. Same test `[locale]/[pageId]/page.tsx`
 * applies to the public half of this endpoint.
 */
function asRow(data: unknown): Record<string, any> | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, any>;
  if (row.id) return row;
  if (row.page && typeof row.page === "object" && row.page.id) return row.page;
  return null;
}

/* ==========================================================================
   Adapters
   ========================================================================== */

function defaultPageAdapter(pageId: string, pageSource: string): PageSourceAdapter {
  return {
    kind: "default",
    supportsPrecondition: true,

    async load() {
      const { data, error } = await $fetch<PageRecord>({
        url: `/api/admin/default-editor/${pageId}?pageSource=${encodeURIComponent(pageSource)}`,
        method: "GET",
        silent: true,
      });
      if (error || !data) return { data: null, error: error ?? null };
      return { data: { ...data, sourceKind: "default" as const }, error: null };
    },

    async save(draft, saved) {
      /* Send only what this editor owns. Spreading the whole record would put
         `id` and `lastModified` in as EDITS — harmless, and impossible to read
         the intent of. */
      const body: Record<string, unknown> = {
        pageSource: draft.pageSource ?? "default",
        title: draft.title,
        status: draft.status,
        meta: draft.meta ?? {},
        /* The backend rejects a home PUT with no `variables` and a legal PUT
           with no `content`, and silently DROPS the wrong one. Sending only
           the field this page's type owns makes that explicit. */
        ...(draft.type === "variables"
          ? { variables: draft.variables ?? {} }
          : { content: draft.content ?? "" }),
        expectedLastModified: saved?.lastModified,
      };

      const { data, error } = await $fetch<{ lastModified?: string }>({
        url: `/api/admin/default-editor/${draft.pageId}`,
        method: "PUT",
        body,
        successMessage: "Page saved",
        errorMessage: "Could not save the page",
      });

      return { lastModified: data?.lastModified, error: error ?? null };
    },
  };
}

/** The exact sentence the default-editor PUT sends on a 409. See `save`. */
const CONFLICT_MESSAGE =
  "This page was changed by someone else since you loaded it. Reload the page to get the current content, then apply your changes again.";

function customPageAdapter(id: string): PageSourceAdapter {
  return {
    kind: "custom",
    /**
     * FALSE, AND THIS IS THE HONEST ANSWER RATHER THAN THE CONVENIENT ONE.
     *
     * `admin/content/page/[id]/index.put.ts` implements no
     * `expectedLastModified`. Because AJV runs non-strict here and the page
     * schema sets no `additionalProperties: false`, sending one anyway would
     * be ACCEPTED AND IGNORED — a guard that reads as armed in this file, has
     * a field for it in the payload, and stops nothing. Declaring it false and
     * doing the check below is the difference between a weaker guarantee and a
     * false one.
     */
    supportsPrecondition: false,

    async load() {
      const { data, error } = await $fetch<Record<string, any>>({
        url: `/api/admin/content/page/${id}`,
        method: "GET",
        silent: true,
      });
      if (error) return { data: null, error };
      const row = asRow(data);
      if (!row) return { data: null, error: "The server returned no page." };
      return { data: cmsRowToPageRecord(row), error: null };
    },

    async save(draft, saved) {
      /**
       * ADVISORY PRE-FLIGHT, and it is worth naming what it is and is not.
       *
       * It reads the row and compares `updatedAt` to the token we loaded
       * with. That is a read-then-write check with a millisecond window
       * between the two, NOT a serialised guard — two saves landing inside
       * that window still both write. What it does catch is the failure this
       * screen actually has: two admins with the page open for minutes, one
       * saving after the other. Without it the second save silently discards
       * the first's whole document.
       *
       * Closing the window properly means a conditional UPDATE on the
       * backend, which is a `backend/dist` rebuild for a page that is saved a
       * handful of times a year. Flagged rather than done.
       *
       * A FAILED PRE-FLIGHT DOES NOT BLOCK THE SAVE. If the row cannot be
       * read, that is not evidence of a conflict, and refusing to save on it
       * would turn a backend blip into "you cannot save your work".
       */
      if (saved?.lastModified) {
        const { data: current, error: checkError } = await $fetch<Record<string, any>>({
          url: `/api/admin/content/page/${draft.pageId}`,
          method: "GET",
          silent: true,
        });
        const row = checkError ? null : asRow(current);
        const serverModified = row ? String(row.updatedAt ?? row.createdAt ?? "") : "";
        if (serverModified && serverModified !== saved.lastModified) {
          /* The default-editor's own wording, to the letter. `usePageDraft`
             classifies a conflict by matching the message — see the note
             there — so reusing the sentence is what makes the existing
             conflict alert render, with no second code path for it. */
          return { error: CONFLICT_MESSAGE };
        }
      }

      const meta = (draft.meta ?? {}) as Record<string, unknown>;
      /* Trimmed here, at the boundary that sends it. The field deliberately
         lets a trailing hyphen be TYPED (or "how-it-works" could never be
         entered a character at a time), so finishing the value is this
         layer's job. */
      const slug = trimSeparators(String(draft.slug ?? "").replace(/^\/+/, ""));

      const body: Record<string, unknown> = {
        /* `title`, `content`, `slug` and `status` are all REQUIRED by
           `pageUpdateSchema` on every write, even one that changes none of
           them — the route 400s on a missing slug by name. */
        title: clamp(draft.title, CAP.title),
        content: draft.content ?? "",
        slug: clamp(slug, CAP.slug),
        status: toCmsStatus(draft.status),
        /* Sent alongside the slug because the model's `beforeSave` will not
           re-derive it: it only fills `path` when empty, so a rename would
           otherwise leave the old path on the row for ever. */
        path: slug ? `/${slug}` : "",
        seoTitle: clamp(meta.seoTitle, CAP.seoTitle),
        seoDescription: clamp(meta.seoDescription, CAP.seoDescription),
        seoKeywords: clamp(joinKeywords(meta.keywords), CAP.seoKeywords),
        /* Sent now that the request schema states a real limit for it. It is
           the owner's stylesheet for this page and the editor shows it, so
           omitting it would make the field read-only in practice. */
        customCss: clamp(draft.customCss, CAP.customCss),
      };

      /* `customJs` and `settings` are deliberately ABSENT. The PUT writes only
         the keys present in the body, so omitting them leaves them untouched —
         and `customJs` is Super-Admin-only, so sending a non-empty value would
         403 for everyone else. This editor does not offer either, so it has no
         business asserting a value for them. `customCss` IS sent: the editor
         shows it, and its cap now matches its column. */

      const { data, error } = await $fetch<Record<string, any>>({
        url: `/api/admin/content/page/${draft.pageId}`,
        method: "PUT",
        body,
        successMessage: "Page saved",
        errorMessage: "Could not save the page",
      });

      if (error) return { error };

      /**
       * THE ECHOED ROW IS THE TRUTH, AND IT IS NOT WHAT WE SENT.
       *
       * This endpoint REWRITES the body on the way in — `updateData.content =
       * sanitizeHTML(updateData.content)` — with a regex stripper whose policy
       * is not the render-side one. It deletes `<form>`, `<input>`, `<button>`,
       * `<iframe>`, `<embed>` and `<object>` tags and blanks `src="data:…"`,
       * several of which `PAGE_CONFIG` deliberately allows. So an owner who
       * pastes a call-to-action `<button>` or an inline `data:` logo has it
       * removed by the server on save.
       *
       * Returning only `updatedAt` and letting the hook adopt the local draft
       * made that invisible in the worst possible way: the editor went on
       * showing markup the database no longer held, `dirty` went false, and the
       * unsaved-changes guard disarmed — so the original existed only in that
       * one tab and vanished silently on the next reload.
       *
       * Handing the row back means the editor shows what was actually stored.
       * If the server changed something, the owner sees it change, which is the
       * only version of this they can act on.
       */
      const row = asRow(data);
      return {
        lastModified: row ? String(row.updatedAt ?? "") || undefined : undefined,
        stored: row ? cmsRowToPageRecord(row) : undefined,
        error: null,
      };
    },

    async remove() {
      /**
       * `force=true` IS LOAD-BEARING, not tidiness.
       *
       * The `page` model is paranoid and `pageSlugKey` is a plain unique index
       * that does not honour `deletedAt` — so a SOFT delete keeps `/fees`
       * claimed for ever. The owner deletes the page, tries to make it again,
       * and is told the URL is taken by a page that no longer appears
       * anywhere. `slug-availability` reports exactly that as
       * `TAKEN_SOFT_DELETED`; this is the flag that stops it happening.
       */
      const { error } = await $fetch({
        url: `/api/admin/content/page/${id}?force=true`,
        method: "DELETE",
        successMessage: "Page deleted",
        errorMessage: "Could not delete the page",
      });
      return { error: error ?? null };
    },
  };
}

/**
 * Which store holds this id.
 *
 * The five built-in ids are exactly `PAGE_CATALOG`'s keys and an added page is
 * addressed by a uuid, so the two sets cannot overlap and the id alone is
 * enough. `pageSource` is still honoured when given, so a caller that already
 * knows does not have to rely on the inference.
 */
export function adapterFor(pageId: string, pageSource = "default"): PageSourceAdapter {
  const isCustom = pageSource === "custom" || !isBuiltInPageId(pageId);
  return isCustom ? customPageAdapter(pageId) : defaultPageAdapter(pageId, pageSource);
}
