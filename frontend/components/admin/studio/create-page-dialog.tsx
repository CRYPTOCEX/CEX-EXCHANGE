"use client";

/**
 * "Add a page" — the whole create flow for an owner-added page.
 * ============================================================================
 *
 * WHAT IT CREATES. A row in the CMS `page` table with `isBuilderPage: false`,
 * which the `[locale]/[pageId]` catch-all serves as HTML once it is published.
 * Not a `default_pages` row: that table's `pageId` is pinned by an `isIn`
 * validator to the five built-in ids, and it has no slug, name or description
 * column to give a sixth page an identity with.
 *
 * NO CONTENT BOX HERE. This dialog settles what the page IS — its name, its
 * URL, whether it is live, and where it is linked from. Writing it is the
 * editor's job, and the editor is one click away with a real preview, an HTML
 * tab and an SEO panel. A textarea here would be a worse version of a tool
 * that already exists.
 */

import * as React from "react";
import { Loader2, Plus, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  normalizeSlugInput,
  slugifyTitle,
  trimSeparators,
} from "@/components/admin/studio/pages-catalog";
import { linkPageIntoChrome } from "@/lib/chrome/link-page";
import { $fetch } from "@/lib/api";

/** The AJV caps on `/api/admin/content/page`. See `page-sources.ts`. */
const CAP = { title: 255, slug: 255, description: 1000 };

type AvailabilityState =
  | { status: "idle" }
  | { status: "checking" }
  /* "unknown" is a real answer and NOT a failure to show the owner. See the
     note on the availability effect below. */
  | { status: "unknown" }
  | { status: "ok" }
  | { status: "taken"; reason: string; message: string };

interface CreatePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new row's id once it exists, so the list can select it. */
  onCreated: (id: string) => void;
}

export function CreatePageDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePageDialogProps) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [publish, setPublish] = React.useState(false);
  const [addToHeader, setAddToHeader] = React.useState(false);
  const [addToFooter, setAddToFooter] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [availability, setAvailability] = React.useState<AvailabilityState>({
    status: "idle",
  });

  /**
   * Whether the owner has taken the URL field over.
   *
   * Until they do, it tracks the title — which is what anyone naming a page
   * "Fees" expects. Once they type in it, it stops moving, because silently
   * rewriting a URL somebody chose is how a page ends up at an address they
   * did not pick and cannot explain.
   */
  const [slugTouched, setSlugTouched] = React.useState(false);

  const reset = React.useCallback(() => {
    setTitle("");
    setSlug("");
    setDescription("");
    setPublish(false);
    setAddToHeader(false);
    setAddToFooter(false);
    setSlugTouched(false);
    setFormError(null);
    setAvailability({ status: "idle" });
  }, []);

  /**
   * The ONE way this dialog closes.
   *
   * Cancel used to call `onOpenChange(false)` directly, which is the parent's
   * `setCreateOpen` — it never reached the `<Dialog onOpenChange>` wrapper that
   * calls `reset()`, because Radix's controlled path does not re-fire the
   * callback when `open` changes from outside. So Cancel left the title, the
   * URL, the checkboxes and any error sitting there for the next time the
   * dialog opened, on top of a page the owner had since created.
   */
  const close = React.useCallback(() => {
    if (busy) return;
    reset();
    onOpenChange(false);
  }, [busy, onOpenChange, reset]);

  const onTitleChange = (next: string) => {
    setTitle(next);
    if (!slugTouched) setSlug(slugifyTitle(next));
  };

  const onSlugChange = (next: string) => {
    setSlugTouched(true);
    /* Normalised on the way IN, not validated on the way out. The column's
       pattern is lowercase-only, so an uppercase slug is a 400 from the
       server — and a field that accepts a character it will later be rejected
       for is a trap, not a validation.

       `normalizeSlugInput`, NOT `slugifyTitle`: the latter trims trailing
       separators, which on a controlled input deletes the hyphen on the
       keystroke that types it — "how-it-works" would arrive as "howitworks".
       The trailing trim happens once, at submit. */
    setSlug(normalizeSlugInput(next));
  };

  /* What actually gets sent. A slug left mid-word ("fees-") is finished here
     rather than rejected — the owner meant "fees". */
  const finalSlug = trimSeparators(slug);

  /**
   * The live availability check.
   *
   * THE ENDPOINT EXISTS AND HAD NO CALLERS. It answers the two ways a slug can
   * be unavailable, which is the whole point of having it: RESERVED (a real
   * platform route already serves `/{locale}/{slug}`, so a page here could
   * never open) and TAKEN (another row holds it — possibly a SOFT-DELETED one,
   * because the unique index does not honour `deletedAt`). Those have
   * different fixes and an owner cannot tell them apart from a failed save.
   *
   * A FAILED CHECK NEVER BLOCKS CREATE. The pre-flight is `edit.page` and the
   * create is `create.page` — a role can hold the second and not the first, so
   * an error here can mean "you may not ask", not "the slug is taken". The
   * server validates the slug on POST regardless; this is here to explain the
   * rejection early, never to be the gate.
   */
  React.useEffect(() => {
    if (!open) return;
    /* The value that will actually be SENT, so the verdict cannot be about a
       different string from the one the server will judge. */
    const candidate = finalSlug;
    /* Returns without writing state. An empty slug is DERIVED as idle below
       rather than stored, because a synchronous `setState` in an effect body
       cascades a render for a value that is already knowable from `slug`. */
    if (!candidate) return;

    let alive = true;

    /* "checking" is written from inside the timer, not from the effect body:
       a synchronous write here would cascade a render on every keystroke, and
       the state is only meaningful once the request is actually in flight. */
    const timer = setTimeout(() => {
      setAvailability({ status: "checking" });
      void (async () => {
        const { data, error } = await $fetch<{
          available: boolean;
          reason: string | null;
          message: string | null;
          slug: string;
        }>({
          url: "/api/admin/content/page/slug-availability",
          method: "GET",
          params: { slug: candidate },
          silent: true,
        });

        if (!alive) return;
        /* The endpoint echoes the slug it judged, so a response for a value
           the owner has already typed past is discarded for free — no request
           id, no sequence number. */
        if (!data || error || data.slug !== candidate) {
          setAvailability({ status: "unknown" });
          return;
        }
        setAvailability(
          data.available
            ? { status: "ok" }
            : {
                status: "taken",
                reason: data.reason ?? "INVALID",
                message: data.message ?? t("that_url_cannot_be_used"),
              }
        );
      })();
    }, 350);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, finalSlug, t]);

  const trimmedTitle = title.trim();
  /* An empty slug is idle by definition, so the verdict for the PREVIOUS slug
     cannot survive the field being cleared and go on claiming the URL is
     taken. Derived rather than written, so the effect never has to write. */
  const verdict: AvailabilityState = finalSlug ? availability : { status: "idle" };
  const canSubmit =
    !busy && trimmedTitle.length > 0 && finalSlug.length > 0 && verdict.status !== "taken";

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setFormError(null);

    /**
     * A NON-EMPTY BODY IS REQUIRED, not a nicety. The model validates
     * `content` with `isValidContent`, which throws "content: Content cannot
     * be empty for non-builder pages" — so a create with an empty body is a
     * 400. The starter also gives the owner something to see in the preview
     * and something to replace, rather than an empty editor that looks broken.
     */
    const starter = `<h1>${escapeHtml(trimmedTitle)}</h1>\n<p>${escapeHtml(
      t("write_this_page_in_the_editor")
    )}</p>`;

    const body: Record<string, unknown> = {
      title: trimmedTitle.slice(0, CAP.title),
      slug: finalSlug,
      content: starter,
      status: publish ? "PUBLISHED" : "DRAFT",
      /* THE FLAG THE PUBLIC RENDERER FORKS ON. `false` means "this body is
         HTML", which is what keeps the page out of the visual builder's list
         and out of its destructive save path. */
      isBuilderPage: false,
      category: "custom",
      seoTitle: trimmedTitle.slice(0, CAP.title),
    };
    /* Omitted rather than sent as null: several of these fields are capped at
       255 by the request schema and `nullable` is decorative under the
       non-strict AJV config, so an explicit null is a needless way to fail. */
    if (description.trim()) {
      body.description = description.trim().slice(0, CAP.description);
      body.seoDescription = description.trim().slice(0, 500);
    }

    const { data, error } = await $fetch<Record<string, any>>({
      url: "/api/admin/content/page",
      method: "POST",
      body,
      silent: true,
    });

    if (error || !data?.id) {
      setBusy(false);
      /* A concurrent create on the same slug hits the unique index and comes
         back as a raw database error. Said plainly, because "SequelizeUnique
         ConstraintError" is not a sentence anybody can act on. */
      setFormError(
        error && /duplicate|unique|ER_DUP/i.test(error)
          ? t("that_url_was_taken_while_you")
          : error || t("the_page_could_not_be_created")
      );
      return;
    }

    const newId = String(data.id);

    /**
     * THE PAGE EXISTS NOW, AND THAT IS WHAT THE DIALOG PROMISED.
     *
     * Linking is attempted second and cannot undo it. Writing the menu first
     * would risk a live navigation item pointing at a page that was never
     * created — a broken link on the public site, traded for one extra click
     * in an admin screen. So a linking failure is reported and the flow
     * completes.
     */
    if (addToHeader || addToFooter) {
      const result = await linkPageIntoChrome({
        title: trimmedTitle,
        slug: finalSlug,
        description: description.trim() || undefined,
        header: addToHeader,
        footer: addToFooter,
      });

      if (!result.ok) {
        /* Three outcomes, three sentences. Collapsing them said "someone
           else was editing the menu" for a network drop, a 500 and the chrome
           size cap alike — a confident wrong diagnosis that sends the owner
           looking for a colleague who is not there. */
        toast.warning(
          result.reason === "permission"
            ? t("page_created_adding_it_to_the")
            : result.reason === "conflict"
              ? t("page_created_but_the_navigation_was")
              : t("page_created_but_the_navigation_could", {
                  detail: result.message ? ` (${result.message})` : "",
                })
        );
      } else {
        toast.success(t("page_created_and_linked"));
      }
    } else {
      toast.success(t("page_created"));
    }

    setBusy(false);
    reset();
    onCreated(newId);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (next) onOpenChange(true);
        else close();
      }}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t("add_a_page")}</DialogTitle>
          <DialogDescription>
            {t("a_page_of_your_own_alongside")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-page-title" className="text-xs font-medium text-foreground">
              {t("page_title")}
            </label>
            <Input
              id="new-page-title"
              value={title}
              maxLength={CAP.title}
              /* An EXAMPLE page, not the word "Fees". This and the slug below
                 are a matched pair — "Fees" becomes "/fees" — which is the one
                 thing about this dialog a first-time author has to understand.

                 They are written as `e.g. …` so they cannot be consolidated
                 into `common.fees` again. The namespace optimizer groups keys
                 by their English value and cannot tell a duplicate from a
                 homonym: it merged both of these into that money LABEL, so the
                 title field prompted "Fees" and the URL field prompted "Fees"
                 in a box that lowercases every keystroke. */
              placeholder={t("page_title_placeholder")}
              onChange={(e) => onTitleChange(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-page-slug" className="text-xs font-medium text-foreground">
              {t("url")}
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                id="new-page-slug"
                value={slug}
                maxLength={CAP.slug}
                // Lowercase on purpose: `normalizeSlugInput` lowercases on every
                // keystroke, so an example with a capital in it demonstrates
                // something this field will not accept.
                placeholder={t("url_placeholder")}
                className="font-mono"
                onChange={(e) => onSlugChange(e.target.value)}
              />
            </div>
            <SlugHint slug={finalSlug} title={title} availability={verdict} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="new-page-description"
              className="text-xs font-medium text-foreground"
            >
              {tCommon("short_description")}{" "}
              <span className="text-muted-foreground">({tCommon("optional")})</span>
            </label>
            <Textarea
              id="new-page-description"
              rows={2}
              value={description}
              maxLength={CAP.description}
              placeholder={t("what_this_page_is_about_used")}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Card padding="sm" className="space-y-2">
            <CheckRow
              id="new-page-publish"
              checked={publish}
              onChange={setPublish}
              label={t("publish_it_now")}
              hint={t("a_draft_page_is_only_visible")}
            />
            <CheckRow
              id="new-page-header"
              checked={addToHeader}
              onChange={setAddToHeader}
              label={t("add_a_link_to_the_site")}
              hint={t("appears_in_the_public_navigation_editable")}
            />
            <CheckRow
              id="new-page-footer"
              checked={addToFooter}
              onChange={setAddToFooter}
              label={t("add_a_link_to_the_footer")}
              hint={t("editable_afterwards_in_admin_footer")}
            />
          </Card>

          {formError ? (
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{formError}</span>
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            {tCommon("create_page")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One checkbox with its own explanation. Three of these, all consequential. */
function CheckRow({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5"
      />
      <div className="space-y-0.5">
        <label htmlFor={id} className="block text-xs font-medium text-foreground">
          {label}
        </label>
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/**
 * What the URL field says under itself.
 *
 * The empty-slug-with-a-title case is called out separately because it has a
 * cause the owner cannot see: a title with no Latin letters or digits — a
 * Chinese or Arabic one — slugifies to nothing, and without a sentence here
 * the field would just refuse to fill in and never say why.
 */
function SlugHint({
  slug,
  title,
  availability,
}: {
  slug: string;
  title: string;
  availability: AvailabilityState;
}) {
  const t = useTranslations("components");
  if (!slug && title.trim()) {
    return (
      <p className="text-[11px] text-warning-ink">{t("type_a_url_for_this_page")}</p>
    );
  }
  if (!slug) {
    return (
      <p className="text-[11px] text-muted-foreground">
        {t("where_the_page_lives_filled_in")}
      </p>
    );
  }
  if (availability.status === "checking") {
    return <p className="text-[11px] text-muted-foreground">{t("checking")}</p>;
  }
  if (availability.status === "ok") {
    return (
      <p className="text-[11px] text-success-ink">{t("slug_is_available", { slug })}</p>
    );
  }
  if (availability.status === "taken") {
    return (
      <div className="space-y-0.5">
        <p className="text-[11px] text-destructive">{availability.message}</p>
        {availability.reason === "TAKEN_SOFT_DELETED" ? (
          <p className="text-[11px] text-muted-foreground">
            {t("a_page_deleted_from_this_screen")}
          </p>
        ) : null}
      </div>
    );
  }
  /* "unknown" and "idle" both fall through to the neutral line: the check
     could not be made, which is not a reason to warn about the slug. */
  return (
    <p className="text-[11px] text-muted-foreground">
      {t("the_page_will_be_served_at", { slug })}
    </p>
  );
}

/** The title goes into an HTML starter document, so it is escaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
