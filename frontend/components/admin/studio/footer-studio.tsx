"use client";

/**
 * /admin/footer — everything the footer SAYS.
 * ============================================================================
 *
 * THE SPLIT. Site Design owns the footer's LAYOUT — which of the three
 * arrangements renders — because that choice is made by looking at the live
 * preview beside it. This page owns the CONTENT: the brand line, the legal line,
 * the social row and the link sections. The two were one cramped tab, and the
 * tab lost: a four-part editor in a 400px rail beside an iframe gave the biggest
 * thing on the page (the link tree) the least room on it.
 *
 * WHAT GOES WHERE, and why it is not one rule for all four sections:
 *
 *   PANEL (340px)  the short fields. A site name, a tagline, a legal template,
 *                  a three-way source switch. None of them is longer than the
 *                  column, and all of them are things you TYPE.
 *   WORKSPACE      whatever is substantial. The link tree is a two-level list
 *                  with six controls per row; a social is a label, a URL and
 *                  eleven icon targets. Both need the width, and neither is
 *                  clearer for being shrunk.
 *   WORKSPACE      ...and when the active section has no substantial editor —
 *                  Brand and Copyright are two boxes each — it holds the
 *                  READ-OUT instead: the whole footer, in words, at full size.
 *                  That is the thing those two sections change, and it is the
 *                  answer to "is my tagline too long" that an iframe at 81%
 *                  scale cannot give.
 *
 * NO IFRAME HERE. The live preview belongs to Site Design and stays there. Two
 * previews is two answers to the same question, and the one on the screen that
 * does not own the layout would be the one people trusted by accident.
 *
 * SAVES ARE PARTIAL — `save(["footerContent"])`. This screen writes one field of
 * the chrome row, so an admin editing menus in another tab cannot be clobbered
 * by a footer save, and vice versa. Narrowing the write is better than detecting
 * the collision after the fact.
 */

import * as React from "react";
import { Link } from "@/i18n/routing";
import {
  Copyright as CopyrightIcon,
  ExternalLink,
  ListTree,
  Loader2,
  RotateCcw,
  Save,
  Share2,
  TriangleAlert,
  Type,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { OverrideEditor } from "@/components/admin/chrome/override-editor";
import { useChrome } from "@/components/chrome/chrome-provider";
import { useFooterData } from "@/components/partials/footer/use-footer-data";
import { renderCopyright, type FooterContent, type FooterSocial } from "@/lib/chrome/content";
import { EMPTY_MENU_OVERRIDE, isEmptyMenuOverride } from "@/lib/chrome/menu-overrides";

import { FooterReadout } from "./footer-readout";
import { FooterSocialsEditor, newFooterSocial } from "./footer-socials-editor";
import { StudioGroup, StudioShell, StudioStatus, type StudioSection } from "./studio-shell";
import { useChromeDraft } from "./use-chrome-draft";
import { useTranslations } from "next-intl";

/**
 * The build-time fallbacks, shown as PLACEHOLDERS so an owner can see what they
 * would be overriding.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, which is exactly why these became
 * editable — on a hosted install nobody can change an env var and rebuild. The
 * same two expressions live in `use-footer-data.ts`, which is the file that
 * actually applies them; this copy exists only to be shown.
 */
const ENV_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";
const ENV_SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  "The most trusted cryptocurrency platform with advanced trading tools and secure storage.";

/** Shown as the copyright placeholder — an example TEMPLATE, not the default. */
const COPYRIGHT_TEMPLATE_EXAMPLE = "© {year} {siteName}. All rights reserved.";

const COPYRIGHT_TOKENS = ["{year}", "{siteName}"] as const;

type SectionId = "brand" | "copyright" | "socials" | "links";

const SECTIONS: readonly StudioSection[] = [
  { id: "brand", label: "Brand", icon: Type, group: "text" },
  { id: "copyright", label: "Copyright", icon: CopyrightIcon, group: "text" },
  { id: "socials", label: "Social links", icon: Share2, group: "lists" },
  { id: "links", label: "Link sections", icon: ListTree, group: "lists" },
];

/**
 * The three answers the socials field can hold.
 *
 * `null` and `[]` are DIFFERENT, and both are reachable from here on purpose:
 * `null` means "use the list in the settings table" and `[]` means "show none".
 * Collapsing them would make removing the last social link inexpressible — it
 * would spring back on the next save — so the switch has three positions and
 * each one says which state it writes.
 */
type SocialSource = "settings" | "list" | "none";

const SOCIAL_SOURCES: readonly {
  id: SocialSource;
  label: string;
  description: string;
}[] = [
  {
    id: "settings",
    label: "Site settings",
    description: "Whatever is configured under system settings. The default.",
  },
  {
    id: "list",
    label: "This page",
    description: "Exactly the links below. The settings list is ignored.",
  },
  {
    id: "none",
    label: "None",
    description: "No social row at all — not the same as “not configured”.",
  },
];

/** An empty box means "use the shipped value", so blank is stored as `null`. */
const blank = (raw: string): string | null => (raw.trim() ? raw : null);

export function FooterStudio() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const { loading, saving, error, errorKind, dirty, draft, update, discard, reload, save } =
    useChromeDraft();

  /**
   * The footer's SHIPPED link tree, read through the same hook the public footer
   * uses — so the editor lists exactly the sections this install renders, which
   * depend on installed extensions and settings. A hardcoded list would offer
   * edits for links that do not exist here and miss the ones that do.
   */
  const footerData = useFooterData();
  /** What the SERVER sent this page load. Used only to date the socials list. */
  const liveChrome = useChrome();

  const [section, setSection] = React.useState<SectionId>("brand");

  const content = draft.footerContent;
  const busy = loading || saving;

  const setContent = React.useCallback(
    (patch: Partial<FooterContent>) => update({ footerContent: { ...content, ...patch } }),
    [content, update]
  );

  /* ---- copyright -------------------------------------------------------- */

  const copyrightRef = React.useRef<HTMLInputElement>(null);

  /**
   * Put a placeholder where the caret is, not on the end.
   *
   * A legal line is usually edited in the middle — `© {year} Acme` becomes
   * `© {year} Acme Holdings Ltd` — and a token that always lands after the
   * full stop is a token you have to cut and paste into place.
   */
  const insertToken = React.useCallback(
    (token: string) => {
      const el = copyrightRef.current;
      const current = content.copyright ?? "";
      const focused = el != null && el === document.activeElement;
      const start = focused ? (el.selectionStart ?? current.length) : current.length;
      const end = focused ? (el.selectionEnd ?? start) : current.length;
      const next = current.slice(0, start) + token + current.slice(end);
      setContent({ copyright: blank(next) });
      if (!el) return;
      /* After React has re-rendered with the new value, or the caret is set on
         the old one and jumps back the moment the value lands. */
      requestAnimationFrame(() => {
        el.focus();
        const at = start + token.length;
        el.setSelectionRange(at, at);
      });
    },
    [content.copyright, setContent]
  );

  const brandName = content.siteName ?? ENV_SITE_NAME;
  /* The line the site will actually print: the admin's own with its placeholders
     filled, or the shipped one — which is `© year name.` plus the TRANSLATED
     tail, exactly as `CopyrightLine` builds it. */
  const renderedCopyright =
    renderCopyright(content.copyright, brandName, footerData.year) ??
    `© ${footerData.year} ${brandName}. ${footerData.allRightsReserved}.`;

  /* ---- socials ---------------------------------------------------------- */

  const socials = content.socials;
  const socialSource: SocialSource =
    socials === null ? "settings" : socials.length > 0 ? "list" : "none";

  /**
   * The last non-empty list, so switching source and back is not a deletion.
   *
   * Session-only and deliberately so: it is a convenience over the draft, never
   * a second copy of the truth. The draft is what saves.
   */
  const socialStash = React.useRef<FooterSocial[]>([]);

  const setSocialSource = React.useCallback(
    (next: SocialSource) => {
      if (socials && socials.length > 0) socialStash.current = socials;
      if (next === "settings") return setContent({ socials: null });
      if (next === "none") return setContent({ socials: [] });
      /* "This page" with nothing to show would read as "None" — the two states
         differ only by length — so it opens with a row to fill in. */
      setContent({
        socials: socialStash.current.length > 0 ? socialStash.current : [newFooterSocial()],
      });
    },
    [setContent, socials]
  );

  /**
   * The settings-derived row, when it can honestly be shown.
   *
   * `useFooterData` resolves socials against the chrome the PROVIDER holds, so
   * its list is the settings one only while that saved chrome also says `null`.
   * Otherwise it is somebody's stored list, and labelling it "what site settings
   * say" would be a lie.
   */
  const settingsSocials =
    liveChrome.footerContent.socials === null ? footerData.socials : null;

  /* ---- links ------------------------------------------------------------ */

  const links = content.links;
  const linksTouched = !isEmptyMenuOverride(links);
  const shippedLinkCount = footerData.shippedSections.reduce(
    (total, node) => total + (node.child?.length ?? 0),
    0
  );

  /* ---- panels ----------------------------------------------------------- */

  const panel =
    section === "brand" ? (
      <StudioGroup
        title={t("brand_text")}
        hint={t("leave_a_box_empty_to_keep")}
      >
        <div className="space-y-3">
          <OptionalField
            id="footer-site-name"
            label={t("site_name")}
            value={content.siteName}
            fallback={ENV_SITE_NAME}
            disabled={busy}
            onChange={(raw) => setContent({ siteName: blank(raw) })}
            help="Names the site in the footer, and fills {siteName} in the legal line."
          />
          <OptionalField
            id="footer-site-description"
            label="Tagline"
            value={content.siteDescription}
            fallback={ENV_SITE_DESCRIPTION}
            disabled={busy}
            onChange={(raw) => setContent({ siteDescription: blank(raw) })}
            help="Shown by the layouts with a brand block — Columns and Centered. Compact does not display it."
          />
        </div>
      </StudioGroup>
    ) : section === "copyright" ? (
      <>
        <StudioGroup title={t("legal_line")}>
          <OptionalField
            id="footer-copyright"
            label={t("your_own_line")}
            value={content.copyright}
            fallback={COPYRIGHT_TEMPLATE_EXAMPLE}
            disabled={busy}
            inputRef={copyrightRef}
            onChange={(raw) => setContent({ copyright: blank(raw) })}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="me-0.5 text-[11px] text-muted-foreground">Insert</span>
            {COPYRIGHT_TOKENS.map((token) => (
              <Button
                key={token}
                type="button"
                size="2xs"
                variant="outline"
                className="h-6 px-1.5 font-mono text-[11px]"
                disabled={busy}
                onClick={() => insertToken(token)}
              >
                {token}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {t("both_are_filled_in_when_the")}
          </p>
        </StudioGroup>

        <StudioGroup title={t("renders_as")}>
          {/* `bg-muted/40` and not `bg-background`: this box sits INSIDE a
              `bg-card` panel, and `background` is below `card` in dark and level
              with it in light — the same surface would read as a recess in one
              theme and as nothing in the other. `muted` is defined against the
              surface it sits on. */}
          <p className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs leading-snug text-foreground">
            {renderedCopyright}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            {content.copyright === null
              ? t("the_shipped_line_its_tail_is")
              : t("your_line_exactly_as_typed_an")}
          </p>
        </StudioGroup>
      </>
    ) : section === "socials" ? (
      <>
        <StudioGroup title={t("where_they_come_from")}>
          <RadioGroup
            className="gap-2"
            value={socialSource}
            disabled={busy}
            onValueChange={(value) => setSocialSource(value as SocialSource)}
          >
            {SOCIAL_SOURCES.map((option) => (
              <div key={option.id} className="flex items-start gap-2">
                <RadioGroupItem
                  id={`footer-social-source-${option.id}`}
                  value={option.id}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <Label
                    htmlFor={`footer-social-source-${option.id}`}
                    className="text-xs font-medium text-foreground"
                  >
                    {option.label}
                  </Label>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </StudioGroup>

        <StudioGroup title={t("now_showing")}>
          {socialSource === "settings" ? (
            <div className="space-y-2">
              <p className="text-[11px] leading-snug text-muted-foreground">
                {settingsSocials
                  ? `${settingsSocials.length} link${settingsSocials.length === 1 ? "" : "s"} from the settings table.`
                  : t("the_list_configured_under_system_settings")}
              </p>
              <Button type="button" size="2xs" variant="outline" className="gap-1.5" asChild>
                <Link href="/admin/system/settings">
                  {tCommon("open_system_settings")}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : socialSource === "none" ? (
            <p className="text-[11px] leading-snug text-muted-foreground">
              {t("the_footer_renders_no_social_row")}
            </p>
          ) : (
            <p className="text-[11px] leading-snug text-muted-foreground">
              {socials?.length ?? 0} link{(socials?.length ?? 0) === 1 ? "" : "s"}, edited on the
              right. Removing the last one leaves this list empty, which is the “None” answer
              above.
            </p>
          )}
        </StudioGroup>
      </>
    ) : (
      <>
        <StudioGroup title={t("your_changes")}>
          <ul className="space-y-1">
            <EditCount label="Hidden" value={links.hidden.length} />
            <EditCount label="Renamed" value={Object.keys(links.labels).length} />
            <EditCount label="Added" value={links.custom.length} />
            <EditCount label={t("reordered_levels")} value={Object.keys(links.order).length} />
          </ul>
          <Button
            type="button"
            size="2xs"
            variant="outline"
            className="mt-2.5 w-full gap-1.5"
            disabled={busy || !linksTouched}
            onClick={() => setContent({ links: EMPTY_MENU_OVERRIDE })}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("reset_every_link_edit")}
          </Button>
        </StudioGroup>

        <StudioGroup
          title={t("how_this_is_stored")}
          hint={t("a_patch_keyed_by_item_not")}
        >
          <p className="text-[11px] leading-snug text-muted-foreground">
            {t("the_list_on_the_right_is")}
          </p>
        </StudioGroup>
      </>
    );

  /* ---- workspace -------------------------------------------------------- */

  const workspace: { title: string; hint?: string; meta?: string; body: React.ReactNode } =
    section === "links"
      ? {
          title: t("link_sections"),
          hint: t("rename_reorder_hide_or_add_your_own"),
          meta: `${footerData.shippedSections.length} sections · ${shippedLinkCount} links`,
          body: (
            <OverrideEditor
              items={footerData.shippedSections}
              override={links}
              disabled={busy || !footerData.ready}
              emptyHint="Footer links appear once site settings have loaded."
              onChange={(next) => setContent({ links: next })}
            />
          ),
        }
      : section === "socials"
        ? {
            title: tCommon("social_links"),
            hint: t("the_icon_follows_the_url_until"),
            meta:
              socials === null
                ? "From site settings"
                : `${socials.length} link${socials.length === 1 ? "" : "s"}`,
            body:
              socials === null ? (
                <div className="rounded-lg border border-dashed border-border bg-card px-3 py-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t("the_footer_is_using_the_social")}
                  </p>
                  <Button
                    type="button"
                    size="2xs"
                    variant="outline"
                    className="mt-2"
                    disabled={busy}
                    onClick={() => setSocialSource("list")}
                  >
                    {t("set_them_here_instead")}
                  </Button>
                </div>
              ) : (
                <FooterSocialsEditor
                  value={socials}
                  disabled={busy}
                  onChange={(next) => setContent({ socials: next })}
                />
              ),
          }
        : {
            title: t("how_the_footer_will_read"),
            hint: t("not_a_preview_the_arrangement_is"),
            body: (
              <FooterReadout
                content={content}
                shipped={footerData.shippedSections}
                ready={footerData.ready}
                year={footerData.year}
                allRightsReserved={footerData.allRightsReserved}
                fallbackName={ENV_SITE_NAME}
                fallbackDescription={ENV_SITE_DESCRIPTION}
                legal={footerData.legal}
                settingsSocials={settingsSocials}
              />
            ),
          };

  return (
    <StudioShell
      title="Footer"
      subtitle={t("brand_legal_line_socials_and_link_sections")}
      sections={SECTIONS}
      activeSection={section}
      onSectionChange={(id) => setSection(id as SectionId)}
      status={<StudioStatus loading={loading} dirty={dirty} />}
      actions={
        <>
          <Button
            type="button"
            size="2xs"
            variant="outline"
            className="gap-1.5"
            disabled={!dirty || busy}
            onClick={discard}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Discard
          </Button>
          <Button
            type="button"
            size="2xs"
            className="gap-1.5"
            disabled={!dirty || busy}
            onClick={() => void save(["footerContent"])}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Save
          </Button>
        </>
      }
      panel={panel}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {workspace.title}
        </h2>
        {workspace.hint ? (
          <p className="hidden truncate text-[11px] text-subtle-foreground lg:block">
            {workspace.hint}
          </p>
        ) : null}
        {workspace.meta ? (
          <span className="ms-auto shrink-0 text-[11px] tabular-nums text-subtle-foreground">
            {workspace.meta}
          </span>
        ) : null}
      </div>

      {/* Centred and capped. The workspace is as wide as the monitor, and a
          19-row list stretched to 1400px puts an item's name and its own
          controls a hand's width apart — the read-out has the same problem as a
          measure. `max-w-5xl` is wide enough that nothing wraps at 1280 and
          narrow enough that the row stays one glance. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto w-full max-w-5xl">
          {error ? (
            <Alert tone="destructive" className="mb-3">
              <TriangleAlert aria-hidden="true" />
              {/* A refused SAVE is not a failed LOAD. The server may have been
                  reached perfectly well and have declined the write because
                  another admin changed the row first, and telling that person
                  their network is down sends them to debug the wrong thing. */}
              <AlertTitle>
                {errorKind === "save"
                  ? t("your_changes_were_not_saved")
                  : t("could_not_load_the_footer_content")}
              </AlertTitle>
              <AlertDescription>
                <p className="break-words">{error}</p>
                <p>
                  {errorKind === "save"
                    ? t("the_server_may_have_refused_the")
                    : t("nothing_has_been_changed_on_the")}
                </p>
                <Button
                  type="button"
                  size="2xs"
                  variant="outline"
                  className="mt-1 w-fit"
                  onClick={() => void reload()}
                >
                  {errorKind === "save" ? t("reload_footer_content") : tCommon("try_again")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {workspace.body}
        </div>
      </div>
    </StudioShell>
  );
}

/**
 * One optional text field.
 *
 * EMPTY MEANS "USE THE SHIPPED VALUE", and the fallback is the PLACEHOLDER —
 * never the value. Pre-filling the box looks friendlier and is a trap: the first
 * save writes today's defaults into the database, the site stops tracking its
 * own defaults, and an owner who later renames the site in the env file sees
 * nothing change with nothing anywhere to explain it.
 */
function OptionalField({
  id,
  label,
  value,
  fallback,
  help,
  disabled,
  inputRef,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  fallback: string;
  help?: string;
  disabled?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (raw: string) => void;
}) {
  const t = useTranslations("components");
  const overridden = value !== null;
  const helpId = help ? `${id}-help` : undefined;

  return (
    <div className="space-y-1">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[11px] font-medium text-foreground">
          {label}
        </Label>
        {overridden ? (
          <Button
            type="button"
            size="2xs"
            variant="ghost"
            className="gap-1 px-1.5 text-[11px] font-normal text-muted-foreground"
            disabled={disabled}
            onClick={() => onChange("")}
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            {t("use_default")}
          </Button>
        ) : (
          <Badge variant="muted" size="xs">
            Default
          </Badge>
        )}
      </div>
      <Input
        id={id}
        ref={inputRef}
        value={value ?? ""}
        placeholder={fallback}
        disabled={disabled}
        aria-describedby={helpId}
        className="h-8 text-sm"
        onChange={(event) => onChange(event.target.value)}
      />
      {help ? (
        <p id={helpId} className="text-[11px] leading-snug text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** One line of the link-edit tally. Zero is stated, not hidden. */
function EditCount({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-baseline justify-between gap-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={value > 0 ? "tabular-nums text-foreground" : "tabular-nums text-subtle-foreground"}>
        {value}
      </span>
    </li>
  );
}
