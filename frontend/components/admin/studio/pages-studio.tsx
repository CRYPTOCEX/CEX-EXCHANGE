"use client";

/**
 * /admin/default-editor — pick a page, see it, open it.
 * ============================================================================
 *
 * WHAT THIS REPLACES
 *
 * A grid of cards, each carrying a description nobody reads twice, a `status`
 * that is "active" on all five, and a "Modified 2h ago" chip that the endpoint
 * FABRICATED at request time — so it said "2h ago" forever, on every install,
 * including ones where nobody had ever opened the editor. Five items do not
 * need a grid, a category sidebar, a grid/list toggle and a search box; they
 * need to be listed once, with something true beside each.
 *
 * So: the same shell as Site Design, Menus and Footer. The rail is the page
 * grouping, the panel is the five pages, and the workspace — which on the other
 * studios holds either a preview or the editor — holds the page itself, live.
 * Choosing a page and looking at it is the entire job of this screen, and now
 * it is the entire screen.
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import {
  ExternalLink,
  FilePlus2,
  FileText,
  Files,
  PencilLine,
  Plus,
  Shield,
  TriangleAlert,
  Users,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loadable } from "@/components/ui/skeleton";
import {
  PreviewFrame,
  PreviewSchemeToggle,
} from "@/components/admin/studio/preview-frame";
import {
  StudioShell,
  type StudioSection,
} from "@/components/admin/studio/studio-shell";
import {
  categoryFor,
  cmsRowToAdminPage,
  formatEdited,
  matchesPageQuery,
  publicPathFor,
  type AdminPage,
  type PageCategoryId,
} from "@/components/admin/studio/pages-catalog";
import { PagesList } from "@/components/admin/studio/pages-list";
import { CreatePageDialog } from "@/components/admin/studio/create-page-dialog";
import { applySchemeTo, type Scheme } from "@/components/admin/design/use-design-draft";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

type SectionId = "all" | PageCategoryId;

/**
 * The rail, with its labels resolved at RENDER rather than at module scope —
 * `useTranslations` is a hook and a module constant cannot call it. The ids and
 * icons are static; only the words move.
 */
const SECTIONS: readonly (Omit<StudioSection, "label"> & { labelKey: string })[] = [
  { id: "all", labelKey: "all_pages", icon: Files, group: "browse" },
  { id: "main", labelKey: "main", icon: FileText, group: "browse" },
  { id: "information", labelKey: "information", icon: Users, group: "browse" },
  { id: "legal", labelKey: "legal", icon: Shield, group: "browse" },
  /* The owner's own pages, in their own group. Separate from "Information"
     because the distinction is real and consequential: the four above are
     compiled routes that exist on every install, and these are rows that can
     be renamed, unpublished and deleted. */
  { id: "custom", labelKey: "added_pages", icon: FilePlus2, group: "browse" },
];

/**
 * How many CMS rows the list will pull, and why not more.
 *
 * `/api/admin/content/page` applies no `excludeFields`, so EVERY row it
 * returns carries its full `content` — on a site with long HTML pages a large
 * page size is megabytes over the wire for a sidebar. 100 is well past what
 * this screen is for; an install with more added pages than that has outgrown
 * a flat list and wants the CMS screen.
 */
const CUSTOM_PAGE_LIMIT = 100;

/**
 * What the workspace header reads from while GET /api/admin/default-editor is
 * in flight.
 *
 * Every field is empty and every one of them is skeletoned at the call site —
 * this exists to restore the TYPE NARROWING the removed `active ? … : null`
 * gate was providing, not to supply values. `lastModified: null` in particular
 * would render as the confident string "Never edited" if it ever reached
 * `formatEdited` unguarded, which is why that call site carries a `Loadable`
 * rather than relying on the constant being harmless.
 */
const PENDING_PAGE: AdminPage = {
  id: "",
  name: "",
  description: "",
  path: "",
  status: "active",
  lastModified: null,
};

export function PagesStudio() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  const [pages, setPages] = React.useState<AdminPage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  /** Separate from `error`: the five built-ins are still usable without it. */
  const [customError, setCustomError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [section, setSection] = React.useState<SectionId>("all");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState("");
  const [scheme, setScheme] = React.useState<Scheme>("dark");

  /**
   * TWO LISTS, TWO STORES, ONE SCREEN.
   *
   * The five built-in pages come from `/api/admin/default-editor`, which is a
   * hardcoded catalogue joined to whatever overrides exist — they are compiled
   * ROUTES, so listing the table instead would show an empty screen on a fresh
   * install. Pages the owner added are rows in the CMS `page` table and come
   * from `/api/admin/content/page`.
   *
   * `$fetch` never throws — it always resolves to `{data, error}` — so a
   * try/catch around either would be dead code, and `Promise.all` here can
   * never reject. The error branches have to be READ for a backend outage to
   * surface at all.
   */
  const fetchPages = React.useCallback(
    () =>
      Promise.all([
        $fetch<AdminPage[]>({
          url: "/api/admin/default-editor",
          method: "GET",
          silent: true,
        }),
        $fetch<{ items?: unknown[] }>({
          url: "/api/admin/content/page",
          method: "GET",
          params: {
            page: 1,
            /* `perPage`, NOT `limit`. `getFiltered` reads `perPage`; a `limit`
               is silently ignored and the response falls back to the default
               page size. */
            perPage: CUSTOM_PAGE_LIMIT,
            sortField: "title",
            sortOrder: "asc",
            /* A JSON `filter`, because `getFiltered` parses that param and
               DROPS a bare `?isBuilderPage=false`. Builder documents belong to
               the visual builder's screen, not this one — they are section
               JSON and this editor cannot open them. */
            filter: JSON.stringify({ isBuilderPage: false }),
          },
          silent: true,
        }),
      ]),
    []
  );

  const applyResult = React.useCallback(
    (
      builtIn: { data: AdminPage[] | null; error: string | null },
      custom: { data: { items?: unknown[] } | null; error: string | null }
    ) => {
      /* The five built-ins failing is the screen failing — there is nothing
         left to show. An added page failing is not: the five are still there
         and still editable, so it gets a line of its own rather than replacing
         everything. A role can hold the permissions for one and not the
         other. */
      setError(builtIn.error ?? null);
      const base = builtIn.error || !Array.isArray(builtIn.data) ? [] : builtIn.data;

      const rows = Array.isArray(custom.data?.items) ? custom.data.items : [];
      /* Filtered again HERE, not only in the query. The server-side filter is
         what makes pagination correct; this is what keeps a builder document
         out of the list if that param ever stops being honoured — the failure
         would otherwise be an owner opening a JSON document in an HTML
         editor. */
      const added = rows
        .filter(
          (row): row is Record<string, any> =>
            !!row && typeof row === "object" && (row as any).isBuilderPage !== true
        )
        .map(cmsRowToAdminPage)
        .filter((page) => page.id && page.slug);

      setCustomError(custom.error ?? null);
      /* The five keep their catalogue order — it is a fixed, meaningful
         sequence and re-sorting the whole list would move Home. */
      setPages([...base, ...added]);
      setLoading(false);
    },
    []
  );

  /* Inside an async IIFE rather than called from the effect body: a synchronous
     `setState` in an effect cascades a render for no reason. */
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const [builtIn, custom] = await fetchPages();
      if (alive) {
        applyResult(
          { data: builtIn.data ?? null, error: builtIn.error ?? null },
          { data: custom.data ?? null, error: custom.error ?? null }
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [applyResult, fetchPages]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [builtIn, custom] = await fetchPages();
    applyResult(
      { data: builtIn.data ?? null, error: builtIn.error ?? null },
      { data: custom.data ?? null, error: custom.error ?? null }
    );
  }, [applyResult, fetchPages]);

  /* The selection is held as an id and falls back to the first row rather than
     to nothing: the catalogue and the endpoint are independently shipped lists,
     and an id that stops resolving must degrade to a usable screen. */
  const active = pages.find((p) => p.id === selectedId) ?? pages[0];

  const visible = React.useMemo(
    () =>
      pages.filter((page) => {
        /* `categoryFor`, not `catalogFor(...).category`: an added page's id is
           a uuid the catalogue knows nothing about, and would fall through to
           "information" — filing every added page under a group it does not
           belong to. */
        if (section !== "all" && categoryFor(page) !== section) return false;
        return matchesPageQuery(page, query);
      }),
    [pages, query, section]
  );

  /* Typing searches EVERY page, whichever group the rail is on — otherwise the
     first use of the box is a lie, showing "no matches" while the match sits
     one group away. */
  const onQueryChange = React.useCallback(
    (next: string) => {
      setQuery(next);
      if (next && section !== "all") setSection("all");
    },
    [section]
  );

  /**
   * `pending` covers "the list has not arrived", which is a different thing
   * from `active` being absent — that one means the list arrived EMPTY, and it
   * gets its own branch below. Collapsing the two is what let the old spinner
   * shadow the empty case.
   */
  const pending = loading;

  /**
   * What the workspace header reads from before the list lands. Removing the
   * `active ? … : null` gate removes the narrowing with it, and one named
   * constant is the replacement rather than `active?.` four times over.
   */
  const page: AdminPage = active ?? PENDING_PAGE;

  /**
   * "No pages were returned." is a RESULT. `pages` is `[]` until the response
   * arrives, so the `!loading` half is what keeps the sentence from greeting an
   * owner on every visit to the screen.
   */
  const showNoPages = !loading && !active;

  /* `publicPathFor`, not the catalogue's fallback: for an added page the
     catalogue would answer `/{uuid}`, and the preview frame and the "open
     live" button would both point at a URL that 404s. */
  const publicPath = active ? publicPathFor(active) : null;
  const src = publicPath ? `/${locale}${publicPath === "/" ? "" : publicPath}` : "";

  /* Same-origin, so the preview's colour scheme is set directly on its root
     rather than asked for — no cooperation from the page is needed and an
     inline declaration outranks every cascade layer. */
  const paint = React.useCallback(
    (doc: Document) => applySchemeTo(doc, scheme),
    [scheme]
  );

  /* Labels resolved here; see the note on SECTIONS. */
  const railSections: StudioSection[] = React.useMemo(
    () => SECTIONS.map(({ labelKey, ...rest }) => ({ ...rest, label: t(labelKey) })),
    [t]
  );

  /* The count is derived rather than written down: the sentence used to say
     "five", and it stops being true the moment an owner adds one. */
  const addedCount = pages.filter((p) => p.pageSource === "custom").length;

  return (
    <>
    <StudioShell
      title="Pages"
      subtitle={
        addedCount > 0
          ? t("the_sites_five_built_in_pages_and", { count: addedCount })
          : t("the_sites_five_built_in_pages")
      }
      backHref="/admin"
      backLabel="Admin"
      sections={railSections}
      activeSection={section}
      onSectionChange={(id) => setSection(id as SectionId)}
      actions={
        <div className="flex items-center gap-1.5">
          {/* Not gated on `active`. Adding a page is the one action on this
              screen that does not need a selection, and an install with no
              pages listed at all is exactly when it is most needed. */}
          <Button
            size="2xs"
            variant="outline"
            className="gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t("add_a_page")}
          </Button>
          {active ? (
            <Button size="2xs" className="gap-1.5" asChild>
              <Link href={`/admin/default-editor/${active.id}/edit`}>
                <PencilLine className="size-3.5" aria-hidden="true" />
                {t("edit", { title: active.name })}
              </Link>
            </Button>
          ) : null}
        </div>
      }
      panel={
        <div className="flex min-h-0 flex-1 flex-col">
          {/* One line, above the list, and only when the SECOND request failed.
              The five built-ins are unaffected and still editable, so taking
              the whole panel away would hide four working pages to report one
              broken list. */}
          {customError ? (
            <p className="border-b border-border bg-warning/10 px-3 py-1.5 text-[11px] text-muted-foreground">
              {t("pages_you_added_could_not_be")}
            </p>
          ) : null}
          <PagesList
            pages={visible}
            selectedId={active?.id ?? ""}
            onSelect={setSelectedId}
            query={query}
            onQueryChange={onQueryChange}
            totalCount={pages.length}
            emptyHint={
              section === "custom"
                ? t("no_pages_added_yet_use_add")
                : section === "all"
                  ? "No pages were returned."
                  : "No page in this group."
            }
            disabled={loading}
          />
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        {/* The bar is `h-9` in every state, so nothing it holds can move the
            workspace — but it used to render EMPTY during the fetch and then
            fill, which is the same defect at a smaller scale. `page` below is
            `active` or PENDING_PAGE, so the bar's four values are laid out from
            the first frame and only their contents wait. */}
        <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
          <h2 className="shrink-0 truncate text-xs font-semibold text-foreground">
            <Loadable loading={pending} placeholder="Home">
              {page.name}
            </Loadable>
          </h2>
          <code className="hidden min-w-0 truncate font-mono text-[10px] text-subtle-foreground sm:block">
            <Loadable loading={pending} placeholder="/about">
              {page.path}
            </Loadable>
          </code>
          <span className="hidden shrink-0 text-[10px] text-subtle-foreground md:block">
            {/* `formatEdited(null)` is the string "Never edited" — a confident
                and often wrong claim about a page whose row has not arrived. */}
            <Loadable loading={pending} placeholder={t("never_edited")}>
              {formatEdited(page.lastModified)}
            </Loadable>
          </span>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <p className="hidden max-w-md truncate text-[11px] text-muted-foreground lg:block">
              <Loadable
                loading={pending}
                placeholder={t("the_sites_public_landing_page")}
              >
                {page.description}
              </Loadable>
            </p>
            {/* An `<a href="">` is not inert — it reloads this admin screen — so
                while pending the same box is a disabled button with no
                destination rather than a live link to nowhere. */}
            {pending ? (
              <Button size="2xs" variant="outline" className="gap-1.5" disabled>
                <ExternalLink className="size-3" aria-hidden="true" />
                {t("open_live")}
              </Button>
            ) : (
              <Button size="2xs" variant="outline" className="gap-1.5" asChild>
                <a href={src} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3" aria-hidden="true" />
                  {t("open_live")}
                </a>
              </Button>
            )}
          </div>
        </header>

        {error ? (
          <div className="p-4">
            <Alert tone="destructive">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>{t("could_not_load_the_page_list")}</AlertTitle>
              <AlertDescription>
                <p className="break-words">{error}</p>
                <div>
                  <Button
                    variant="outline"
                    size="2xs"
                    className="mt-1"
                    onClick={() => void load()}
                  >
                    {tCommon("try_again")}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : showNoPages ? (
          /* A RESULT, and it needs a finished request to be one. `pages` is
             `[]` before the response, so without `!loading` this screen would
             open on "No pages were returned." — which is exactly the sentence an
             owner would read as a broken endpoint. */
          <p className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            {t("no_pages_were_returned")}
          </p>
        ) : (
          /* ONE PreviewFrame in both states. The spinner it replaced discarded
             the frame's ENTIRE toolbar — three device buttons, the scale
             readout, the light/dark toggle, the reload and open controls, and
             the note strip — none of which depends on which page was selected,
             and all of which therefore has no business waiting for the list.
             `pending` keeps every one of them and puts a placeholder in the one
             box that genuinely needs the answer: the document. */
          <PreviewFrame
            src={src}
            pending={pending}
            onPaint={paint}
            toolbarEnd={
              <>
                <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
                <PreviewSchemeToggle scheme={scheme} onChange={setScheme} />
              </>
            }
            note={
              /* A draft added page previews as the 404 page, because the public
                 route only serves PUBLISHED rows. Without saying so, the frame
                 looks broken and the cause is invisible. */
              page.pageSource === "custom" && page.status !== "active" ? (
                <>{t("this_page_is_a_draft_so")}</>
              ) : (
                <>
                  This is the page as it is <span className="font-medium">saved</span>. Open the
                  editor to change it — the editor previews your draft before you save.
                </>
              )
            }
          />
        )}
      </div>
    </StudioShell>

    <CreatePageDialog
      open={createOpen}
      onOpenChange={setCreateOpen}
      onCreated={(id) => {
        /* Select the new page as well as reloading, so the owner lands on
           what they just made rather than back on Home. `load()` is not
           awaited here: the id is valid the moment the POST returned, and the
           selection resolves as soon as the row arrives. */
        setSelectedId(id);
        void load();
      }}
    />
    </>
  );
}
