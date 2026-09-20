"use client";

/**
 * /admin/default-editor/{pageId}/edit — one editor for both kinds of page.
 * ============================================================================
 *
 * THE CHANGE THAT MATTERS: THE WORKSPACE IS THE REAL PAGE
 *
 * The previous editor put nine tabs down the left and, in each one, a
 * hand-drawn approximation of the band being edited. All nine drawings had
 * drifted — one previewed a "Live Markets" panel that exists nowhere on the
 * site, another showed 2024 prices out of a `MOCK_ASSETS` constant, and the
 * README's map of which lines of `home.tsx` they mirrored pointed into a file
 * 500 lines shorter than the current one. So an owner edited a headline, looked
 * at a picture of a headline, saved, and then found out.
 *
 * Now the workspace frames `/` itself and the draft is posted into it, so what
 * is on screen IS the page. Picking a section in the rail scrolls the frame to
 * that band. There is nothing left to keep in step.
 *
 * TWO PAGE KINDS, ONE SCREEN
 *   `variables` (home)  — a rail of bands, a panel of fields, the live page.
 *   `content` (legal)   — one HTML body, so the workspace is the writing
 *                         surface and the rail is short.
 * They share the shell, the draft, the save model and the dirty affordances,
 * because they are the same tool pointed at different documents. The old code
 * re-derived `pageId === "home"` in four separate files and they had already
 * started to disagree about which ids exist.
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
  Eye,
  FileText,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  Settings,
  Tag,
  Trash2,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loadable } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { WysiwygEditor } from "@/components/ui/wysiwyg";
import {
  PreviewFrame,
  PreviewSchemeToggle,
  type PreviewFrameHandle,
} from "@/components/admin/studio/preview-frame";
import {
  StudioShell,
  StudioStatus,
  type StudioSection,
} from "@/components/admin/studio/studio-shell";
import { FieldControl } from "@/components/admin/studio/field-controls";
import { HomeModulesPanel } from "@/components/admin/studio/home-modules-panel";
import {
  HOME_SECTIONS,
  countSectionChanges,
  type EditorSection,
} from "@/components/admin/studio/home-schema";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  catalogFor,
  normalizeSlugInput,
  trimSeparators,
} from "@/components/admin/studio/pages-catalog";
import { unlinkPageFromChrome } from "@/lib/chrome/link-page";
import { $fetch } from "@/lib/api";
import { usePageDraft, type PageRecord } from "@/components/admin/studio/use-page-draft";
import {
  LegalTemplateWizard,
  TEMPLATE_WIZARD_TITLE_ID,
} from "@/components/admin/studio/legal/legal-template-wizard";
import { applySchemeTo, type Scheme } from "@/components/admin/design/use-design-draft";
import {
  PAGE_PREVIEW_MESSAGE,
  type PagePreviewMessage,
} from "@/lib/default-page/preview-bridge";
import { useTranslations } from "next-intl";

/** The rail for a page whose whole body is one HTML document. */
const CONTENT_SECTIONS: readonly EditorSection[] = [
  { id: "content", label: "Content", icon: FileText, group: "content", fields: [] },
  { id: "preview", label: "Preview", icon: Eye, group: "content", fields: [] },
  { id: "seo", label: "Search & sharing", icon: Tag, group: "page", custom: "seo", fields: [] },
  { id: "settings", label: "Page settings", icon: Settings, group: "page", custom: "settings", fields: [] },
];

/**
 * Which pageIds the template wizard can actually generate a document for.
 *
 * The old editor's map also accepted `privacy-policy`, `terms-of-service`,
 * `terms-and-conditions` and `contact-us` — none of which the backend's
 * `validPageIds` allows, so those four branches could never run. Narrowing to
 * the wizard's own union means the compiler now enforces the agreement instead
 * of a string comparison quietly failing at runtime.
 */
type TemplatePageId = "about" | "privacy" | "terms" | "contact";
const TEMPLATE_IDS: readonly TemplatePageId[] = ["about", "privacy", "terms", "contact"];

function asTemplateId(pageId: string): TemplatePageId | null {
  return (TEMPLATE_IDS as readonly string[]).includes(pageId)
    ? (pageId as TemplatePageId)
    : null;
}

export function PageEditorStudio({ pageId }: { pageId: string }) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  const draftState = usePageDraft(pageId);
  const {
    draft,
    saved,
    loading,
    saving,
    dirty,
    error,
    errorKind,
    readOnly,
    update,
    setPath,
    discard,
    save,
    reload,
    remove,
    sourceKind,
  } = draftState;

  const entry = catalogFor(pageId);
  /**
   * A page the owner ADDED, rather than one of the five compiled-in ones.
   *
   * Read off the hook (which asked the adapter) rather than re-derived from
   * the id here. The old editor derived `pageId === "home"` in four separate
   * files and they had begun to disagree; this is the same question one layer
   * out and would go the same way.
   */
  const isCustom = sourceKind === "custom";
  const isVariables = entry.kind === "variables";
  const sections = isVariables ? HOME_SECTIONS : CONTENT_SECTIONS;

  const [sectionId, setSectionId] = React.useState(sections[0].id);
  const [scheme, setScheme] = React.useState<Scheme>("dark");
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  /**
   * The URL field's verdict, lifted so Save can read it.
   *
   * Without this the editor DETECTS the collision, prints it in red under the
   * field, and then lets Save fire anyway — and the CMS update route has no
   * try/catch around the write, so a duplicate slug surfaces as an unmapped
   * `pageSlugKey` violation: a generic 500 that never mentions the URL, about
   * a condition the screen was already showing.
   */
  const [slugTaken, setSlugTaken] = React.useState(false);
  const frameRef = React.useRef<PreviewFrameHandle>(null);

  const section = sections.find((s) => s.id === sectionId) ?? sections[0];
  const busy = loading || saving;
  const locked = Boolean(readOnly);

  /**
   * The document, as a shape that exists before the fetch does.
   *
   * The rail, the section schema, every label and every field in this studio
   * are LOCAL CONSTANTS (`HOME_SECTIONS` / `CONTENT_SECTIONS`) — knowable the
   * instant the route renders. Only the values inside them are pending, so
   * `if (loading) return <spinner/>` was throwing away a 48px rail, a 340px
   * panel of ~12 labelled controls and a full-height workspace in order to
   * centre one 16px glyph, and putting all of it back at once when the fetch
   * landed.
   *
   * `Partial<PageRecord>` rather than a `PENDING_PAGE` literal because there is
   * genuinely no document yet and a literal would have to invent a title, a
   * status and a pageId to satisfy the type — inventions that then render as
   * confident statements. A Partial says "not here yet" and the compiler makes
   * every read acknowledge it, in ONE place, instead of `draft?.` scattered
   * down 300 lines of JSX.
   */
  const doc: Partial<PageRecord> = draft ?? {};

  /**
   * Nothing is editable until there is something to edit.
   *
   * Separate from `locked` (which is the server's read-only verdict and has its
   * own banner) because the reason differs and so does the remedy. A control
   * that accepts a keystroke at 120ms and is overwritten by the fetch at 200ms
   * loses the keystroke silently, which is worse than being disabled for 200ms.
   */
  const fieldsDisabled = locked || loading;

  /**
   * The page's public URL.
   *
   * The RECORD's answer wins over the catalogue's. For an added page the
   * catalogue has never heard of the id and falls back to `/{uuid}` — not a
   * route — so the preview frame would load the 404 page and the "open live"
   * link would go nowhere. The five built-ins carry no `publicPath` and keep
   * using the catalogue, which is where their answer has always come from.
   */
  const publicPath = doc.publicPath ?? entry.publicPath;
  const src = `/${locale}${publicPath === "/" ? "" : publicPath}`;

  /* ----------------------------------------------------------------------
     THE BRIDGE

     Everything the frame needs travels in one message — the whole document,
     never a per-section diff. The chrome preview learned that the hard way:
     its payload started as two fields, later editors added more, and the frame
     filled the absent ones with DEFAULTS while confidently claiming to show the
     draft. A preview that disagrees with the editor is worse than none.
     ---------------------------------------------------------------------- */
  const paint = React.useCallback(
    (doc: Document, win: Window) => {
      applySchemeTo(doc, scheme);
      const message: PagePreviewMessage = {
        type: PAGE_PREVIEW_MESSAGE,
        pageId,
        variables: (draft?.variables ?? null) as Record<string, unknown> | null,
        content: draft?.content ?? null,
        focusSection: section.preview ?? null,
      };
      win.postMessage(message, window.location.origin);
    },
    [draft?.content, draft?.variables, pageId, scheme, section.preview]
  );

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== `${PAGE_PREVIEW_MESSAGE}:ready`) return;
      frameRef.current?.repaint();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /**
   * Is the band this section edits actually ON the page right now?
   *
   * Several are conditional on something the editor does not control — the
   * ticker needs a live market, the mobile band needs a store link in system
   * settings. When the marker is missing the scroll silently does nothing,
   * which is indistinguishable from a broken rail. Reading the frame directly
   * is exact and needs no cooperation: it is same-origin, so the marker either
   * is in that document or it is not.
   *
   * The check is delayed rather than run inline because it has to happen AFTER
   * the frame has re-rendered from the message just posted — and running it
   * from a timeout keeps the `setState` out of the effect body, which is both
   * the lint rule and the reason the rule exists.
   */
  const [bandAbsent, setBandAbsent] = React.useState(false);
  React.useEffect(() => {
    const marker = section.preview;
    const id = window.setTimeout(() => {
      const doc = frameRef.current?.document();
      if (!doc?.body) return;
      setBandAbsent(
        Boolean(marker) && !doc.querySelector(`[data-preview-section="${CSS.escape(marker!)}"]`)
      );
    }, 900);
    return () => window.clearTimeout(id);
  }, [section.preview, draft?.variables]);

  /* ----------------------------------------------------------------------
     LEAVING

     `beforeunload` in the draft hook covers reloads and closed tabs; it cannot
     see an in-app route change. The back link goes through here so the one
     gesture an owner is most likely to make after a long edit — clicking back
     to the page list — cannot silently discard the work.
     ---------------------------------------------------------------------- */
  const leave = React.useCallback(() => {
    if (
      dirty &&
      !window.confirm(t("you_have_unsaved_changes_on_this"))
    ) {
      return;
    }
    router.push("/admin/default-editor");
  }, [dirty, router]);

  /**
   * Delete the page, then tidy the navigation it was linked from.
   *
   * ORDER, AND WHAT COUNTS AS A FAILURE. The row goes first, because that is
   * what the owner asked for and what the confirmation described. The chrome
   * cleanup afterwards is BEST EFFORT: the page is gone whether or not it
   * succeeds, so a failure there is a note, not an error and certainly not a
   * reason to leave the owner on a page that no longer exists.
   *
   * `router.push` rather than `leave()`: `leave` prompts about unsaved changes,
   * and there is nothing left to save them to.
   */
  const onDelete = React.useCallback(async () => {
    if (!remove) return;
    setDeleting(true);
    const slug = draft?.slug ?? "";
    const ok = await remove();
    if (!ok) {
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }
    if (slug) {
      const result = await unlinkPageFromChrome(slug);
      if (!result.ok) {
        toast.warning(
          t("page_deleted_but_its_navigation_links")
        );
      }
    }
    setConfirmDelete(false);
    router.push("/admin/default-editor");
  }, [draft?.slug, remove, router, t]);

  /* Memoised because `setMeta` closes over it — a fresh `{}` each render would
     give that callback a new identity every time and defeat every consumer's
     memoisation, which is exactly the defect that made the old editor re-render
     its whole active section on each keystroke. */
  const meta = React.useMemo(
    () => (draft?.meta ?? {}) as Record<string, unknown>,
    [draft?.meta]
  );
  const setMeta = React.useCallback(
    (key: string, value: unknown) => update({ meta: { ...meta, [key]: value } }),
    [meta, update]
  );

  /* ======================================================================
     PANEL
     ====================================================================== */

  /**
   * "Nothing loaded" is the FAILED state, not the pending one.
   *
   * It has to say so itself now that the `if (loading) return <spinner/>` above
   * it is gone. Left as a bare `if (!draft)` it fires on every mount for the
   * length of the fetch and tells the owner to "fix the error above" while
   * there is no error above — the exact class of confident falsehood an early
   * return hides rather than prevents. `!loading` in this guard is the fix, not
   * the defect the scanner's `hidden-while-loading` rule hunts for, which is
   * why it is a NAME and not an inline condition.
   */
  const showNothingLoaded = !loading && !draft;

  const panel = (() => {
    if (showNothingLoaded) {
      return (
        <p className="px-3 py-16 text-center text-xs text-muted-foreground">
          {t("nothing_loaded_fix_the_error_above_and_try_again")}
        </p>
      );
    }

    if (section.custom === "settings") {
      return (
        <div className="space-y-3 p-3">
          <div className="space-y-1">
            <label
              htmlFor="page-title"
              className="block text-[11px] font-medium text-foreground"
            >
              {t("internal_title")}
            </label>
            {/* NOT wrapped in a skeleton. An input's box is 28px tall
                whatever is inside it, so an empty disabled field and a filled
                one occupy the identical space — and a pulsing bar inside a
                text field reads as a broken control, not as a pending one. */}
            <Input
              removeWrapper
              id="page-title"
              value={doc.title ?? ""}
              onChange={(e) => update({ title: e.target.value })}
              disabled={fieldsDisabled}
              className="h-7 w-full rounded-md border-input bg-background px-2 text-xs"
            />
            <p className="text-[10px] leading-snug text-muted-foreground">
              {isCustom
                ? t("shown_as_the_pages_heading_and")
                : t("names_this_record_in_the_admin")}
            </p>
          </div>

          {/* The URL, editable — but only for a page whose URL is a stored
              slug. The five built-ins are compiled routes: `/about` is a
              directory in the app tree, and a text box promising to move it
              would be a control that cannot do what it says. */}
          {isCustom ? (
            <SlugField
              slug={doc.slug ?? ""}
              excludeId={pageId}
              disabled={fieldsDisabled}
              onChange={(next) => update({ slug: next, publicPath: `/${next}` })}
              onVerdict={setSlugTaken}
            />
          ) : null}

          {/* Page CSS, added pages only. The five built-ins are styled by the
              app's own stylesheet and have no per-page column to write to. */}
          {isCustom ? (
            <div className="space-y-1">
              <label
                htmlFor="page-custom-css"
                className="block text-[11px] font-medium text-foreground"
              >
                {t("page_css")}
              </label>
              <Textarea
                id="page-custom-css"
                rows={6}
                value={doc.customCss ?? ""}
                maxLength={65535}
                disabled={fieldsDisabled}
                spellCheck={false}
                placeholder={".fees-table td { padding: .5rem }"}
                onChange={(e) => update({ customCss: e.target.value })}
                className="font-mono text-[11px]"
              />
              <p className="text-[10px] leading-snug text-muted-foreground">
                {t("css_for_this_page_only_applied")}
              </p>
            </div>
          ) : null}

          <div className="space-y-1">
            <label
              htmlFor="page-status"
              className="block text-[11px] font-medium text-foreground"
            >
              Status
            </label>
            {/* `""` while pending, and it matters which way this falls: the
                default is `"active"`, so `doc.status ?? "active"` would paint
                the word ACTIVE onto a page that is about to resolve to Draft —
                a status control asserting the wrong status is worse than one
                asserting none. No `<option>` carries `""`, so the browser
                shows the select empty and the 28px box is unchanged. */}
            <select
              id="page-status"
              value={loading ? "" : (doc.status ?? "active")}
              onChange={(e) => update({ status: e.target.value })}
              disabled={fieldsDisabled}
              className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs text-foreground"
            >
              <option value="active">{isCustom ? tCommon("published") : tCommon("active")}</option>
              <option value="draft">{tCommon("draft")}</option>
            </select>
            <p className="text-[10px] leading-snug text-muted-foreground">
              {/* THE BUILT-IN SENTENCE IS FALSE FOR AN ADDED PAGE, and in the
                  direction that costs the owner a live page. "The route exists
                  either way" is true of the five: `/about` is compiled in and
                  serves its default copy whatever this says. An added page has
                  no route of its own — it is served by the catch-all, and the
                  public endpoint only answers for PUBLISHED rows, so Draft
                  here means the URL 404s to everyone. */}
              {isCustom
                ? t("draft_pages_return_404_to_visitors")
                : t("the_route_exists_either_way_this")}
            </p>
          </div>

          <dl className="space-y-1 rounded-lg border border-border bg-card p-2 text-[10px]">
            {/* The two pending VALUES in this block. Placeholders are shaped
                like what actually arrives — the route's own `pageId` prop for
                the first, and the wider of the two possible `type` words for
                the second — so the 10px row keeps its height and very nearly
                its width. */}
            <div className="flex justify-between gap-2">
              <dt className="text-subtle-foreground">{t("page_id")}</dt>
              <dd className="font-mono text-foreground">
                <Loadable loading={loading} placeholder={pageId}>
                  {doc.pageId}
                </Loadable>
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-subtle-foreground">{t("stored_as")}</dt>
              <dd className="text-foreground">
                <Loadable loading={loading} placeholder="variables">
                  {doc.type}
                </Loadable>
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-subtle-foreground">{t("public_path")}</dt>
              <dd className="font-mono text-foreground">{publicPath}</dd>
            </div>
          </dl>

          {/* Added pages only. The five built-ins are routes in the app tree —
              there is no row to delete, and the page would still be served. */}
          {isCustom && remove ? (
            <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
              <p className="text-[10px] font-medium text-foreground">{t("delete_this_page")}</p>
              <p className="text-[10px] leading-snug text-muted-foreground">
                {t("removes_the_page_and_frees_its")}
              </p>
              <Button
                size="2xs"
                variant="destructive"
                className="mt-1 gap-1.5"
                disabled={busy || deleting}
                onClick={() => setConfirmDelete(true)}
              >
                {deleting ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-3" aria-hidden="true" />
                )}
                {t("delete_page")}
              </Button>
            </div>
          ) : null}
        </div>
      );
    }

    if (section.custom === "seo") {
      const keywords = Array.isArray(meta.keywords)
        ? (meta.keywords as string[]).join(", ")
        : typeof meta.keywords === "string"
          ? meta.keywords
          : "";
      return (
        <div className="space-y-3 p-3">
          <div className="space-y-1">
            <label htmlFor="seo-title" className="block text-[11px] font-medium text-foreground">
              {t("search_title")}
            </label>
            <Input
              removeWrapper
              id="seo-title"
              value={(meta.seoTitle as string) ?? ""}
              onChange={(e) => setMeta("seoTitle", e.target.value)}
              disabled={fieldsDisabled}
              className="h-7 w-full rounded-md border-input bg-background px-2 text-xs"
            />
            {/* Only the COUNT waits. `meta` is `{}` until the fetch lands, so
                an unguarded counter prints a confident `0/60` for a title that
                is about to resolve to 48 characters — and the sentence after
                it is a constant that has no business flickering. Two digits
                reserved because that is what a real count is. */}
            <p className="text-[10px] text-subtle-foreground tabular-nums">
              <Loadable loading={loading} chars={2}>
                {String((meta.seoTitle as string) ?? "").length}
              </Loadable>
              /60 — Google shows about 60 characters.
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="seo-desc" className="block text-[11px] font-medium text-foreground">
              {t("search_description")}
            </label>
            <Textarea
              id="seo-desc"
              value={(meta.seoDescription as string) ?? ""}
              onChange={(e) => setMeta("seoDescription", e.target.value)}
              rows={4}
              disabled={fieldsDisabled}
              className="min-h-0 resize-y rounded-md border-input bg-background px-2 py-1.5 text-xs"
            />
            <p className="text-[10px] text-subtle-foreground tabular-nums">
              <Loadable loading={loading} chars={3}>
                {String((meta.seoDescription as string) ?? "").length}
              </Loadable>
              /160
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="seo-kw" className="block text-[11px] font-medium text-foreground">
              Keywords
            </label>
            <Input
              removeWrapper
              id="seo-kw"
              value={keywords}
              onChange={(e) =>
                setMeta(
                  "keywords",
                  e.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean)
                )
              }
              disabled={fieldsDisabled}
              placeholder={t("crypto_trading_wallet")}
              className="h-7 w-full rounded-md border-input bg-background px-2 text-xs"
            />
            <p className="text-[10px] leading-snug text-muted-foreground">
              {t("comma_separated_stored_as_a_list")}
            </p>
          </div>
        </div>
      );
    }

    if (section.custom === "extensions") {
      return (
        <div className="p-3">
          {/* `value` is already typed `Record | null | undefined` and the panel
              defaults an absent map to the catalogue order, so a pending
              document renders the full module list at its default positions —
              the same rows, the same count, the same height as the resolved
              one. Disabled, because those defaults are not yet the owner's. */}
          <HomeModulesPanel
            value={doc.variables?.extensionSections as never}
            savedValue={saved?.variables?.extensionSections as never}
            onChange={(next) => setPath("extensionSections", next)}
            disabled={fieldsDisabled}
          />
        </div>
      );
    }

    if (!isVariables && (section.id === "content" || section.id === "preview")) {
      const body = doc.content ?? "";
      const words = body.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
      return (
        <div className="space-y-3 p-3">
          {/* Both counts are derived from a body that does not exist yet, so
              unguarded they read `0` and `0` — and zero words is a specific,
              alarming claim to make about a legal page that is in fact 1,400
              words long. A legal document runs to four figures either way, so
              four characters are reserved. */}
          <dl className="space-y-1 rounded-lg border border-border bg-card p-2 text-[10px]">
            <div className="flex justify-between gap-2">
              <dt className="text-subtle-foreground">Words</dt>
              <dd className="tabular-nums text-foreground">
                <Loadable loading={loading} chars={4}>
                  {words}
                </Loadable>
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-subtle-foreground">Characters</dt>
              <dd className="tabular-nums text-foreground">
                <Loadable loading={loading} chars={4}>
                  {body.length}
                </Loadable>
              </dd>
            </div>
          </dl>

          {asTemplateId(pageId) ? (
            <div className="space-y-1.5 rounded-lg border border-border bg-card p-2">
              <p className="text-[11px] font-medium text-foreground">{t("start_from_a_template")}</p>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Answers a few questions and writes a complete document. It{" "}
                <span className="font-medium text-foreground">{t("replaces_everything")}</span> on this
                page — there is no merge and no undo, so it is worth saving first if the current
                text matters.
              </p>
              <Button
                size="2xs"
                variant="outline"
                className="w-full gap-1.5"
                disabled={fieldsDisabled}
                onClick={() => setWizardOpen(true)}
              >
                <Wand2 className="size-3" aria-hidden="true" />
                {t("open_the_template_wizard")}
              </Button>
            </div>
          ) : null}

          <p className="text-[10px] leading-snug text-muted-foreground">
            The site adds its own typography to unstyled markup, so headings and lists here will
            look a little different once published. Use{" "}
            <span className="font-medium text-foreground">Preview</span> in the rail to see the
            real page.
          </p>
        </div>
      );
    }

    /* The ordinary case: a section of the schema. */
    return (
      <div className="space-y-3 p-3">
        {section.hint ? (
          <p className="text-[11px] leading-snug text-muted-foreground">{section.hint}</p>
        ) : null}
        {/* `variables` is typed `unknown` here and `readPath` returns
            `undefined` for any path through a non-object, so a pending
            document renders every field of the section with its control empty
            and its "changed" dot off — the same node count, the same order,
            the same height as the resolved panel. */}
        {section.fields.map((field) => (
          <FieldControl
            key={field.path}
            field={field}
            variables={doc.variables}
            savedVariables={saved?.variables}
            onChange={setPath}
            disabled={fieldsDisabled}
          />
        ))}
      </div>
    );
  })();

  /* ======================================================================
     WORKSPACE
     ====================================================================== */

  const showWysiwyg = !isVariables && section.id === "content";

  const workspace = (() => {
    if (error && errorKind === "load") {
      return (
        <div className="flex flex-1 items-start justify-center p-6">
          <Alert tone="destructive" className="max-w-lg">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>{t("could_not_load_this_page")}</AlertTitle>
            <AlertDescription>
              <p className="break-words">{error}</p>
              {/* Saying what was NOT done matters more than the error string:
                  the old editor answered a failed load with an editable empty
                  document, and one Save wrote that stub over the real page. */}
              <p>{t("nothing_has_been_changed_the_stored")}</p>
              <div>
                <Button variant="outline" size="2xs" className="mt-1" onClick={() => void reload()}>
                  {tCommon("try_again")}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    if (showNothingLoaded) {
      return (
        <p className="flex flex-1 items-center justify-center px-6 text-center text-xs text-muted-foreground">
          {t("nothing_loaded_for")} {pageId}.
        </p>
      );
    }

    if (showWysiwyg) {
      /*
        Mounted immediately, at `""`.
        ------------------------------------------------------------------
        This is the one branch where mounting early could have been wrong —
        rich-text editors classically read `value` once at init and then own
        the DOM, which is exactly why the mailwizard template editor next door
        gates its Unlayer mount on `blocksLoaded`. `WysiwygEditor` is not that
        shape: it mirrors `value` into state on every change
        (`useEffect(… setEditorContent(value), [value])`) and a second effect
        writes that into `editorRef.current.innerHTML` whenever the two
        disagree, so a mount at `""` picks the document up when it lands.
        History initialises on the first non-empty value for the same reason.

        The payoff is the toolbar: ~30 buttons in a fixed 40px bar, plus the
        520px `minHeight` writing surface. All of it is chrome that was being
        withheld to show one spinner in the middle of a full-height column.
      */
      return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background p-4">
          <div className="mx-auto w-full max-w-4xl">
            <WysiwygEditor
              value={doc.content ?? ""}
              onChange={(next: string) => update({ content: next })}
              uploadDir="legal-pages"
              minHeight={520}
              variant="borderless"
              showWordCount
            />
          </div>
        </div>
      );
    }

    if (section.custom === "seo") {
      return (
        <SeoPreview
          meta={meta}
          fallbackTitle={doc.title}
          path={publicPath}
          loading={loading}
        />
      );
    }

    /*
      Mounted before the draft exists, deliberately — and this is the branch
      that gains the most from it.

      `src` is derived from the locale and the catalogue entry, both known at
      render, so the iframe can start fetching the real page immediately
      instead of after a round trip it has nothing to do with. That is the slow
      half of this screen; serialising the two was costing the whole preview
      load for no reason.

      It is also self-correcting rather than merely tolerable. `paint` posts
      `variables: draft?.variables ?? null`, which the bridge reads as "render
      what is saved" — so the frame shows the live page rather than a blank —
      and `paint` is a `useCallback` keyed on `draft?.content` and
      `draft?.variables`. When the draft lands its identity changes,
      `PreviewFrame`'s paint effect is keyed on `onPaint`, and the whole
      150/400/900/1800/3200ms convergence burst re-runs against the draft. No
      extra plumbing, no chance of the preview sticking on the saved state.
    */
    return (
      <PreviewFrame
        ref={frameRef}
        src={src}
        onPaint={paint}
        toolbarEnd={
          <>
            <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            <PreviewSchemeToggle scheme={scheme} onChange={setScheme} />
          </>
        }
        note={
          isVariables ? (
            bandAbsent ? (
              <span className="text-warning-ink">
                <span className="font-medium">{section.label}</span> is not on the page right now,
                so there is nothing to scroll to.
                {section.absentHint ? ` ${section.absentHint}` : ""} {t("your_edits_are_still_saved")}
              </span>
            ) : (
              <>
                {/* Only claim "unsaved" when something actually is. Saying it
                    while the badge reads Saved is the kind of small
                    contradiction that costs trust in both. */}
                {dirty ? t("your_unsaved_draft_in_the_real_page") : t("the_real_page_live")}{" "}
                {section.preview ? (
                  <>
                    {t("scrolled_to")} <span className="font-medium">{section.label}</span>.
                  </>
                ) : null}
              </>
            )
          ) : (
            <>
              The page as it is <span className="font-medium">saved</span> — the site renders this
              body on the server, so it updates here after you save.
            </>
          )
        }
      />
    );
  })();

  /* ======================================================================
     SHELL
     ====================================================================== */

  const railSections: StudioSection[] = sections.map((s) => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    group: s.group,
  }));

  return (
    <>
      {/* `entry.id` is a fine fallback title for a built-in page — it reads
          "about" — but for an added page it is the row's uuid, which is not a
          title. That case falls back to the word instead. */}
      <StudioShell
        title={draft?.title || (isCustom ? tCommon("page") : entry.id)}
        subtitle={
          isCustom
            ? t("a_page_you_added")
            : isVariables
              ? t("sections_of_the_home_page")
              : t("one_document_rendered_on_the_site")
        }
        backHref="/admin/default-editor"
        backLabel="Pages"
        onBack={leave}
        sections={railSections}
        activeSection={section.id}
        onSectionChange={setSectionId}
        sectionBadge={
          isVariables && draft
            ? (id) => {
                const target = HOME_SECTIONS.find((s) => s.id === id);
                if (!target) return 0;
                return countSectionChanges(target, draft.variables, saved?.variables);
              }
            : undefined
        }
        status={<StudioStatus loading={loading} dirty={dirty} />}
        actions={
          <>
            <Button
              variant="outline"
              size="2xs"
              className="gap-1.5"
              onClick={discard}
              disabled={!dirty || busy}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Discard
            </Button>
            <Button
              size="2xs"
              className="gap-1.5"
              onClick={() => void save()}
              /* `slugTaken` too: the URL field already knows this write will
                 be refused, and letting it through turns a sentence the screen
                 is displaying into an unmapped 500 that never mentions the
                 URL. */
              disabled={!dirty || busy || locked || slugTaken}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-3.5" aria-hidden="true" />
              )}
              Save
            </Button>
          </>
        }
        panel={
          <>
            {readOnly ? (
              <div className="border-b border-border p-2">
                <Alert tone="warning">
                  <Lock aria-hidden="true" />
                  <AlertTitle>{t("read_only")}</AlertTitle>
                  <AlertDescription>
                    <p className="break-words">{readOnly}</p>
                    <div>
                      <Button
                        variant="outline"
                        size="2xs"
                        className="mt-1"
                        onClick={() => void reload()}
                      >
                        {t("try_loading_again")}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
            {error && errorKind !== "load" ? (
              <div className="border-b border-border p-2">
                <Alert tone="destructive">
                  <TriangleAlert aria-hidden="true" />
                  <AlertTitle>
                    {errorKind === "conflict"
                      ? t("somebody_else_saved_this_page_first")
                      : t("your_changes_were_not_saved")}
                  </AlertTitle>
                  <AlertDescription>
                    <p className="break-words">{error}</p>
                    {errorKind === "conflict" ? (
                      <p>
                        {t("reloading_brings_their_version_in_and")}
                      </p>
                    ) : null}
                    <div>
                      <Button
                        variant="outline"
                        size="2xs"
                        className="mt-1"
                        onClick={() => void reload()}
                      >
                        {t("reload_the_page")}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}
            {panel}
          </>
        }
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">{workspace}</div>
      </StudioShell>

      <TemplateWizardDialog
        pageType={asTemplateId(pageId)}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onGenerate={(html) => {
          update({ content: html });
          setWizardOpen(false);
          /* Loud, because this just replaced the whole document and the only
             way back is to leave without saving. */
          toast.success(t("template_applied_nothing_is_saved_until"));
        }}
      />

      {/* The delete confirmation NAMES the page and its URL. "Are you sure?"
          on a screen showing one page is a question the owner cannot answer
          wrongly and therefore stops reading. */}
      <Dialog open={confirmDelete} onOpenChange={(next) => !deleting && setConfirmDelete(next)}>
        <DialogContent size="md">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              {t("delete", { title: draft?.title || t("this_page") })}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t("this_removes_the_page_permanently_and", { path: publicPath })}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleting}
                onClick={() => void onDelete()}
              >
                {deleting ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden="true" />
                )}
                {t("delete_page")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * The URL field for an added page.
 *
 * Its own component because it owns a debounced request and a piece of state
 * the editor does not otherwise have, and because the same pre-flight is used
 * by the create dialog — keeping the shapes side by side is what stops the two
 * disagreeing about what "taken" means.
 *
 * `excludeId` is what stops the page colliding with ITSELF: without it, every
 * check of an unchanged slug reports TAKEN, by this very row.
 */
function SlugField({
  slug,
  excludeId,
  disabled,
  onChange,
  onVerdict,
}: {
  slug: string;
  excludeId: string;
  disabled: boolean;
  onChange: (next: string) => void;
  /** Reports "this URL is taken" upward, so Save can refuse. */
  onVerdict: (taken: boolean) => void;
}) {
  const t = useTranslations("components");
  const [state, setState] = React.useState<
    { status: "idle" | "checking" | "ok" | "unknown" } | { status: "taken"; message: string }
  >({ status: "idle" });

  React.useEffect(() => {
    /* The value that will actually be SENT — trailing separators are trimmed
       on the way to the server, so judging the untrimmed string would ask
       about a URL nobody is going to store. */
    const candidate = trimSeparators(slug.trim());
    /* Returns without writing. The empty case is DERIVED below rather than
       stored — a synchronous `setState` in an effect body cascades a render
       for something already knowable from `slug`. */
    if (!candidate) return;
    let alive = true;
    /* Written from inside the timer, not the effect body — a synchronous
       write here cascades a render on every keystroke. */
    const timer = setTimeout(() => {
      setState({ status: "checking" });
      void (async () => {
        const { data, error } = await $fetch<{
          available: boolean;
          message: string | null;
          slug: string;
        }>({
          url: "/api/admin/content/page/slug-availability",
          method: "GET",
          params: { slug: candidate, excludeId },
          silent: true,
        });
        if (!alive) return;
        /* The endpoint echoes the slug it judged, so a stale response is
           dropped without a request id. */
        if (!data || error || data.slug !== candidate) {
          setState({ status: "unknown" });
          return;
        }
        setState(
          data.available
            ? { status: "ok" }
            : { status: "taken", message: data.message ?? t("that_url_cannot_be_used") }
        );
      })();
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [slug, excludeId, t]);

  /* Empty slug is idle by definition, so a stale "taken" from the previous
     value cannot outlive the field being cleared. */
  const verdict = slug.trim() ? state : ({ status: "idle" } as const);

  /* Reported up rather than only drawn, so the Save gate and the red line
     under the field can never disagree about whether this URL is usable. */
  React.useEffect(() => {
    onVerdict(verdict.status === "taken");
  }, [onVerdict, verdict.status]);

  return (
    <div className="space-y-1">
      <label htmlFor="page-slug" className="block text-[11px] font-medium text-foreground">
        {t("url")}
      </label>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">/</span>
        <Input
          removeWrapper
          id="page-slug"
          value={slug}
          maxLength={255}
          disabled={disabled}
          /* Normalised on the way in — the column's pattern is lowercase-only,
             so a field that accepted anything else would be collecting a value
             the save is going to be rejected for. */
          /* `normalizeSlugInput`, not `slugifyTitle`: the latter trims the
             trailing separator, which on a controlled input swallows the
             hyphen on the keystroke that types it. */
          onChange={(e) => onChange(normalizeSlugInput(e.target.value))}
          /* No `h-7` / `px-2`. The primitive sizes itself from
             `--control-height-scale` and `--control-padding-scale`, and twMerge
             DELETES those calc() classes when a literal height or inline
             padding is passed — which would opt this one field out of the
             density scale the rest of the admin follows. */
          className="w-full rounded-md border-input bg-background font-mono text-xs"
        />
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">
        {verdict.status === "taken" ? (
          <span className="text-destructive">{verdict.message}</span>
        ) : verdict.status === "checking" ? (
          t("checking")
        ) : (
          t("changing_this_changes_the_pages_address")
        )}
      </p>
    </div>
  );
}

/* ==========================================================================
   THE TEMPLATE WIZARD'S MODAL

   `LegalTemplateWizard` is a PANEL — `flex flex-col h-full`, no backdrop, no
   `fixed`, no portal, no z-index. Rendered bare it is a very tall block in the
   document flow, and since the studio shell is `h-dvh overflow-hidden` that put
   the entire wizard off the bottom of the screen. The editor it was lifted out
   of wrapped it in a modal; this is that wrapper, made explicit and reusable.

   Radix's Dialog is doing real work here beyond the overlay: focus is trapped
   inside a four-step form whose first action REPLACES the whole document,
   Escape closes, the background stops scrolling, and the rest of the page is
   hidden from assistive tech. Hand-rolling `fixed inset-0` gets the picture
   right and none of that.
   ========================================================================== */

function TemplateWizardDialog({
  pageType,
  open,
  onOpenChange,
  onGenerate,
}: {
  /** `null` for a page with no template — the dialog then never opens. */
  pageType: TemplatePageId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (html: string) => void;
}) {
  const t = useTranslations("components");
  /**
   * A ref, not state: this is read inside Radix's dismissal handlers, never
   * rendered. Holding it in state would re-render the whole editor on every
   * keystroke inside the wizard to change a value nothing displays.
   */
  const dirty = React.useRef(false);

  /**
   * Closing throws away four steps of typed answers.
   *
   * The wizard unmounts on close — which is right, so reopening starts clean
   * rather than resuming somebody else's half-filled form — but that makes an
   * accidental dismissal unrecoverable. Escape, a backdrop click and the
   * wizard's own Cancel all funnel through here.
   *
   * The asymmetry is what gave it away: the studio guards the PAGE draft with
   * `beforeunload` and an in-app confirm, while the wizard's own input had
   * neither. One stray Escape after closing a country dropdown and an address,
   * two emails, a phone number and ten edited clauses were gone.
   */
  const confirmDiscard = React.useCallback(
    () =>
      !dirty.current ||
      window.confirm(t("discard_what_you_have_filled_in")),
    []
  );

  /* Stable, so the wizard's reporting effect fires on real changes rather than
     on every render of this tree. */
  const trackDirty = React.useCallback((next: boolean) => {
    dirty.current = next;
  }, []);

  return (
    <Dialog
      open={open && Boolean(pageType)}
      onOpenChange={(next) => {
        if (!next && !confirmDiscard()) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        size="4xl"
        /* Radix asks before it closes, so a cancelled confirm leaves the dialog
           exactly as it was rather than closing and reopening. */
        onEscapeKeyDown={(event) => {
          if (!confirmDiscard()) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (!confirmDiscard()) event.preventDefault();
        }}
        /* The wizard draws its own header with a Cancel button, so Radix's
           corner ✕ would be a second, differently-styled way to do the same
           thing three centimetres away. */
        hideCloseButton
        /* `aria-labelledby` at the wizard's own visible heading rather than a
           visually-hidden copy: one title, announced once. */
        aria-labelledby={TEMPLATE_WIZARD_TITLE_ID}
        aria-describedby={undefined}
        /* `p-0` and `gap-0` undo DialogContent's own grid padding — the wizard
           pads each of its three bands itself and would otherwise sit in a
           24px frame. `dvh`, not `vh`: on mobile Safari `100vh` is the tallest
           the viewport ever gets, which would push the footer — the only place
           Back/Next live — under the browser chrome. */
        className="flex h-[min(88dvh,820px)] flex-col gap-0 overflow-hidden p-0"
      >
        {pageType ? (
          <LegalTemplateWizard
            pageType={pageType}
            onDirtyChange={trackDirty}
            onClose={() => {
              if (!confirmDiscard()) return;
              onOpenChange(false);
            }}
            onGenerate={(html) => {
              /* Applying is not discarding — the answers have been used, so the
                 close that follows must not ask. */
              dirty.current = false;
              onGenerate(html);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ==========================================================================
   SEO WORKSPACE

   A search result and a share card, drawn to the same truncation rules the real
   ones use. The point is not decoration: an owner cannot otherwise tell that a
   62-character title will be cut, and the old editor's answer was a number
   beside the field, which tells you the length and not the consequence.
   ========================================================================== */

function SeoPreview({
  meta,
  fallbackTitle,
  path,
  loading,
}: {
  meta: Record<string, unknown>;
  /**
   * Optional now that the studio renders before its document arrives. The two
   * `||` fallbacks below already handle an absent title — the change is that
   * "absent" is a real state on the first paint, not just a malformed record.
   */
  fallbackTitle?: string;
  path: string;
  loading?: boolean;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const title = (meta.seoTitle as string) || fallbackTitle || tCommon("untitled_page");
  const description =
    (meta.seoDescription as string) || t("no_description_set_search_engines_will");
  const keywords = Array.isArray(meta.keywords) ? (meta.keywords as string[]) : [];
  const host = typeof window !== "undefined" ? window.location.host : "example.com";

  const clip = (text: string, at: number) =>
    text.length > at ? `${text.slice(0, at).trimEnd()}…` : text;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            {t("search_result")}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {host}
            {path}
          </p>
          {/* The two `||` chains resolve to "Untitled page" and "No description
              set" when there is no document, and a SERP mock is exactly the
              wrong place to assert either — it is a picture of what Google will
              show. Placeholders are sized at the truncation limits this card is
              about (60 and 160 characters), so the pending block is the same
              one and two lines the real one occupies. */}
          <p className="mt-0.5 text-lg leading-snug text-info-ink">
            <Loadable loading={Boolean(loading)} chars={52}>
              {clip(title, 60)}
            </Loadable>
          </p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            <Loadable loading={Boolean(loading)} chars={148}>
              {clip(description, 160)}
            </Loadable>
          </p>
          {title.length > 60 || description.length > 160 ? (
            <p className="mt-2 text-[11px] text-warning-ink">
              {t("trimmed_above_the_full_text_is")}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
            {t("shared_link")}
          </h3>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex h-28 items-center justify-center bg-surface-2 text-[11px] text-subtle-foreground">
              {t("no_share_image_is_set_for_built_in_pages")}
            </div>
            <div className="space-y-0.5 p-3">
              <p className="text-[10px] uppercase tracking-wide text-subtle-foreground">{host}</p>
              <p className="truncate text-sm font-medium text-foreground">
                <Loadable loading={Boolean(loading)} chars={40}>
                  {title}
                </Loadable>
              </p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                <Loadable loading={Boolean(loading)} chars={120}>
                  {description}
                </Loadable>
              </p>
            </div>
          </div>
        </section>

        {keywords.length > 0 ? (
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">
              Keywords
            </h3>
            <div className="flex flex-wrap gap-1">
              {keywords.map((k) => (
                <Badge key={k} tone="neutral" appearance="soft" size="xs">
                  {k}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
              {t("major_search_engines_have_ignored_the")}
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
