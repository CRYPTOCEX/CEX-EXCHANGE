"use client";

/**
 * Site Design — the whole visual identity of the public site, in one screen.
 * ============================================================================
 *
 * WHY THE THEME AND CHROME EDITORS ARE ONE PAGE NOW
 *
 * They were two: `/admin/design` owned colour, radius and typeface, and
 * `/admin/appearance` owned which navbar and footer LAYOUT renders. That split
 * follows the implementation — one is expressible as custom properties, the
 * other is a component tree — and it is invisible to the person using it.
 * Choosing a navbar and choosing the colour it is painted in is one decision,
 * and taking it across two pages meant saving one, navigating, and hoping.
 *
 * So: one page, one preview, one Save. What is NOT here is menu CONTENT and
 * footer CONTENT — those are lists, they do not need a live preview to be
 * understood, and they have screens of their own. The rule that decides where
 * something lives is exactly that: if you have to SEE it to judge it, it is
 * here.
 *
 * ONE SAVE, TWO ENDPOINTS. The theme is stored as a setting and the chrome as
 * its own row, so a save can touch either or both. The button reflects what the
 * owner sees — "are there unsaved changes on this screen" — rather than which
 * table happens to back each control, and it writes only the halves that are
 * actually dirty.
 */

import * as React from "react";
import { useRouter } from "@/i18n/routing";
import {
  Download,
  Loader2,
  PanelBottom,
  PanelTop,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Sparkles,
  Type as TypeIcon,
  Undo2,
  Upload,
  Wand2,
  MoreHorizontal,
  TriangleAlert,
  Table2,
  SquareMousePointer,
  SquareStack,
  TextCursorInput,
  ChartSpline,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { normalizeTheme, type TokenGroup } from "@/lib/design-theme";
import {
  DEFAULT_SEED,
  generatePalette,
  matchPresetId,
  type PaletteSeed,
} from "@/lib/design-palette";
import {
  applyVarsTo,
  clearVarsFrom,
  useDesignDraft,
  type Scheme,
} from "@/components/admin/design/use-design-draft";
import {
  PresetGallery,
  SeedStudio,
  ShapeTypeMotion,
  TokenGrid,
} from "@/components/admin/design/design-controls";
import { DesignAudit } from "@/components/admin/design/design-audit";
import { ComponentTokens } from "@/components/admin/design/component-controls";
import { FooterPicker, NavbarPicker } from "@/components/admin/chrome/chrome-controls";
import { SitePreview } from "@/components/admin/studio/site-preview";
import {
  StudioGroup,
  StudioShell,
  StudioStatus,
  type StudioSection,
} from "@/components/admin/studio/studio-shell";
import { useChromeDraft } from "@/components/admin/studio/use-chrome-draft";
import { getFooterVariant, getNavbarVariant } from "@/lib/chrome/variants";
import { useTranslations } from "next-intl";

const SECTIONS: readonly StudioSection[] = [
  { id: "presets", label: "Presets", icon: Sparkles, group: "theme" },
  { id: "palette", label: "Palette studio", icon: Wand2, group: "theme" },
  { id: "tokens", label: "Colours", icon: Sliders, group: "theme" },
  { id: "shape", label: "Type & shape", icon: TypeIcon, group: "theme" },
  { id: "audit", label: "Accessibility", icon: ShieldCheck, group: "theme" },
  { id: "navbar", label: "Navbar layout", icon: PanelTop, group: "chrome" },
  { id: "footer", label: "Footer layout", icon: PanelBottom, group: "chrome" },
  /**
   * COMPONENT GEOMETRY — plans/COMPONENT-SYSTEM.md.
   *
   * A third group rather than more entries under `theme`, because the preview
   * has to swing to the specimen for any of it to be judgeable, and that swing
   * keys off the group. The order within it is by how much of the product each
   * one moves: tables are most of what an operator looks at, controls are on
   * every screen, then cards, then the two narrower families.
   */
  { id: "c-table", label: "Tables", icon: Table2, group: "components" },
  { id: "c-control", label: "Buttons & inputs", icon: SquareMousePointer, group: "components" },
  { id: "c-card", label: "Cards", icon: SquareStack, group: "components" },
  { id: "c-form", label: "Forms & dialogs", icon: TextCursorInput, group: "components" },
  { id: "c-dataviz", label: "Charts & metrics", icon: ChartSpline, group: "components" },
];

/**
 * WHICH SECTION IS OPEN SURVIVES A REFRESH, because it lives in the URL.
 * ============================================================================
 *
 * This screen is worked in for long stretches and reloaded constantly — a
 * backend restart, a dev rebuild, a stale settings fetch. Landing back on
 * "Presets" every time meant re-navigating to the panel you were mid-edit in,
 * and on a page whose whole job is comparing before and after, that is the one
 * piece of state most expensive to lose. It also makes the tab linkable: a
 * `?section=c-table` in a bug report opens where the reporter was.
 *
 * `history.replaceState`, NOT `pushState`. Next supports both for search-param
 * updates without a server round trip, but pushing would put an entry in the
 * back stack for every tab click — twelve sections in, Back would walk the rail
 * backwards instead of leaving the studio, which is not what Back means here.
 *
 * Reading in a `useState` initializer is safe because `DesignStudio` never
 * renders on the server: `admin/design/page.tsx` holds it behind
 * `settingsFetched`, which starts `false`. The `typeof window` guard stays
 * anyway — that gate is somebody else's file and could reasonably change.
 */
const SECTION_PARAM = "section";
const SECTION_IDS = new Set(SECTIONS.map((s) => s.id));

function readSectionFromUrl(): string {
  if (typeof window === "undefined") return SECTIONS[0].id;
  const value = new URLSearchParams(window.location.search).get(SECTION_PARAM);
  /* An unknown id falls back rather than rendering an empty panel — the param
     is user-editable and survives a rename of any section in SECTIONS. */
  return value && SECTION_IDS.has(value) ? value : SECTIONS[0].id;
}

/** Section id -> the token group it edits. */
const COMPONENT_GROUP: Record<string, TokenGroup> = {
  "c-table": "table",
  "c-control": "control",
  "c-card": "card",
  "c-form": "form",
  "c-dataviz": "dataviz",
};

/** A stored variant id this build has no component for. Explained, never hidden. */
function StaleNotice({ storedId, fallback, what }: { storedId: string; fallback: string; what: string }) {
  return (
    <Alert tone="warning" className="mb-3">
      <TriangleAlert aria-hidden="true" />
      <AlertDescription>
        <p>
          The saved {what} layout <code className="rounded-sm bg-warning/20 px-1">{storedId}</code>{" "}
          is not part of this build, so the site renders <span className="font-medium">{fallback}</span>{" "}
          instead. Choosing one below replaces it.
        </p>
      </AlertDescription>
    </Alert>
  );
}

export function DesignStudio() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const theme = useDesignDraft();
  const chrome = useChromeDraft();

  const [section, setSectionState] = React.useState(readSectionFromUrl);

  const setSection = React.useCallback((id: string) => {
    setSectionState(id);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set(SECTION_PARAM, id);
    window.history.replaceState(null, "", url);
  }, []);
  const [scheme, setScheme] = React.useState<Scheme>("dark");
  const [seed, setSeed] = React.useState<PaletteSeed>(DEFAULT_SEED);
  const [applyToEditor, setApplyToEditor] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  /* Optional: paint the admin shell itself with the draft. Off by default and
     deliberately so — an owner mid-experiment can easily produce a palette in
     which this page's own controls are unreadable, and the preview already
     answers "what does it look like" without putting the escape hatch behind
     the very colours being tested. */
  React.useEffect(() => {
    if (!applyToEditor) {
      clearVarsFrom(document);
      return;
    }
    applyVarsTo(document, theme.draft, scheme);
  }, [applyToEditor, theme.draft, scheme]);

  /* Always clean up on unmount, or a discarded draft keeps painting the rest of
     the admin until a full reload. `clearVarsFrom`, not an empty theme: an
     empty theme would PIN the shell to the shipped palette and quietly un-theme
     every other admin page instead of releasing it back to what is saved. */
  React.useEffect(() => () => clearVarsFrom(document), []);

  const activePresetId = React.useMemo(() => matchPresetId(theme.draft), [theme.draft]);

  const generate = React.useCallback(() => {
    const palette = generatePalette(seed);
    theme.replaceDraft({ ...theme.draft, light: palette.light, dark: palette.dark, presetId: undefined });
    toast.success(t("palette_generated_from_your_seeds"));
  }, [seed, theme]);

  const exportTheme = React.useCallback(() => {
    const blob = new Blob([JSON.stringify(normalizeTheme(theme.draft), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design-theme.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [theme.draft]);

  const importTheme = React.useCallback(
    async (file: File) => {
      const text = await file.text();
      try {
        theme.replaceDraft(normalizeTheme(JSON.parse(text)));
        toast.success(t("theme_imported_review_it_then_save"));
      } catch {
        toast.error(t("that_file_is_not_a_design_theme"));
      }
    },
    [theme]
  );

  /* One dirty flag for the owner, two underneath. */
  const dirty = theme.dirty || chrome.dirty;
  const busy = theme.saving || chrome.saving || chrome.loading;

  const saveAll = React.useCallback(async () => {
    /* Only the halves that actually changed are written. The chrome save is a
       PARTIAL one — this screen owns the two layout ids and nothing else, so it
       cannot clobber a menu or footer-content edit made on another screen. */
    const wroteTheme = theme.dirty;
    const wroteChrome = chrome.dirty;
    if (wroteTheme) await theme.save();
    if (wroteChrome) await chrome.save(["navbarVariant", "footerVariant"]);
    if (!wroteTheme && !wroteChrome) return;

    /* SAVE MEANS SAVE — the site changes now, not on the next hard reload.
       ----------------------------------------------------------------------
       Both hooks have already rewritten the custom properties React refuses to
       re-render (see `lib/live-style.ts`), which covers everything CSS can
       express. What CSS cannot express is the navbar and footer LAYOUT: those
       are component trees chosen on the server from `getChrome()`, and they are
       carried by `ChromeProvider` from the root layout. Nothing client-side can
       swap them.

       `router.refresh()` re-renders the server tree in place — keeping this
       page's own client state, this draft and the preview iframe exactly as
       they are — so the new variant is what mounts, and Next's client router
       cache stops serving the pre-save chrome to the next navigation. The
       settings fetch behind it is `no-store`, so there is no revalidate window
       to wait out. */
    router.refresh();
  }, [theme, chrome, router]);

  const discardAll = React.useCallback(() => {
    theme.discard();
    chrome.discard();
  }, [theme, chrome]);

  const panel = (
    <>
      {section === "presets" ? (
        <StudioGroup>
          <PresetGallery
            activeId={activePresetId}
            scheme={scheme}
            onApply={(p) => {
              theme.applyPreset(p);
              setSeed(p.seed);
            }}
          />
        </StudioGroup>
      ) : null}

      {section === "palette" ? (
        <StudioGroup>
          <SeedStudio seed={seed} onSeedChange={setSeed} onGenerate={generate} />
        </StudioGroup>
      ) : null}

      {section === "tokens" ? (
        <StudioGroup bleed>
          <TokenGrid
            scheme={scheme}
            resolveToken={theme.resolveToken}
            isOverridden={theme.isOverridden}
            setToken={theme.setToken}
            clearToken={theme.clearToken}
          />
        </StudioGroup>
      ) : null}

      {section === "shape" ? (
        <StudioGroup>
          <ShapeTypeMotion
            resolveToken={theme.resolveToken}
            isOverridden={theme.isOverridden}
            setToken={theme.setToken}
            clearToken={theme.clearToken}
            fonts={theme.draft.fonts}
            setFont={theme.setFont}
          />
        </StudioGroup>
      ) : null}

      {section === "audit" ? (
        <StudioGroup>
          <DesignAudit resolveToken={theme.resolveToken} scheme={scheme} />
        </StudioGroup>
      ) : null}

      {section === "navbar" ? (
        <StudioGroup hint={t("every_layout_is_fed_the_same")}>
          {chrome.stale.navbar ? (
            <StaleNotice
              storedId={chrome.stale.navbar}
              fallback={getNavbarVariant(null).label}
              what="navbar"
            />
          ) : null}
          <NavbarPicker
            value={chrome.draft.navbarVariant}
            live={chrome.saved?.navbarVariant}
            disabled={busy}
            onChange={(navbarVariant) => chrome.update({ navbarVariant })}
          />
        </StudioGroup>
      ) : null}

      {/* No `hint` — StudioGroup renders it BELOW its children, so an intro
          sentence landed at the bottom of a 9-control panel where nobody would
          read it. The preset row carries the one line that matters. */}
      {COMPONENT_GROUP[section] ? (
        <StudioGroup bleed>
          <ComponentTokens
            group={COMPONENT_GROUP[section]}
            resolveToken={theme.resolveToken}
            isOverridden={theme.isOverridden}
            setToken={theme.setToken}
            clearToken={theme.clearToken}
          />
        </StudioGroup>
      ) : null}

      {section === "footer" ? (
        <StudioGroup hint={t("three_arrangements_of_the_same_footer")}>
          {chrome.stale.footer ? (
            <StaleNotice
              storedId={chrome.stale.footer}
              fallback={getFooterVariant(null).label}
              what="footer"
            />
          ) : null}
          <FooterPicker
            value={chrome.draft.footerVariant}
            live={chrome.saved?.footerVariant}
            disabled={busy}
            onChange={(footerVariant) => chrome.update({ footerVariant })}
          />
        </StudioGroup>
      ) : null}
    </>
  );

  return (
    <StudioShell
      title={t("site_design")}
      subtitle={t("colour_type_and_layout_for_the_public_site")}
      sections={SECTIONS}
      activeSection={section}
      onSectionChange={setSection}
      status={<StudioStatus loading={chrome.loading} dirty={dirty} />}
      panel={panel}
      actions={
        <>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importTheme(file);
              e.target.value = "";
            }}
          />

          {/* The rarely-used global actions live behind one control so the bar
              stays readable. Save and Discard are the two an owner reaches for
              mid-edit; Reset, Import and Export are once-a-project actions and
              do not deserve equal weight. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label={tCommon("more_actions")}>
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setApplyToEditor((v) => !v)}>
                {applyToEditor ? t("stop_previewing_on_this_page") : t("preview_on_this_page_too")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                {t("import_theme")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportTheme}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {t("export_theme")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* "Palette" rather than "colours": this also clears the radius,
                  the typeface and the motion curves, which the old wording did
                  not admit to. It leaves component geometry alone — each
                  component panel has its own Reset all. */}
              <DropdownMenuItem onClick={theme.resetToShipped}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {t("reset_palette_to_shipped")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={discardAll}
            disabled={!dirty || busy}
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => void saveAll()}
            disabled={!dirty || busy}
          >
            {theme.saving || chrome.saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Save
          </Button>
        </>
      }
    >
      {chrome.error ? (
        <Alert tone="destructive" className="m-3 mb-0">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>
            {chrome.errorKind === "save"
              ? t("your_layout_changes_were_not_saved")
              : t("could_not_load_the_layout_settings")}
          </AlertTitle>
          <AlertDescription>
            <p className="break-words">{chrome.error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void chrome.reload()}
            >
              {chrome.errorKind === "save" ? t("reload_settings") : tCommon("try_again")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <SitePreview
        theme={theme.draft}
        chrome={chrome.draft}
        scheme={scheme}
        onSchemeChange={setScheme}
        focus={COMPONENT_GROUP[section] ? "components" : "site"}
        focusGroup={COMPONENT_GROUP[section]}
      />
    </StudioShell>
  );
}

export default DesignStudio;
