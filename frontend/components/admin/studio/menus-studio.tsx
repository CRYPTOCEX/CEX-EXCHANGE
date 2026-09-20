"use client";

/**
 * /admin/menus — the whole screen. Nothing here but menus.
 * ============================================================================
 *
 * WHY THE WORKSPACE IS THE EDITOR AND NOT A PREVIEW
 *
 * `StudioShell` hands its centre column to whatever the screen's subject is.
 * Site Design fills it with the live site because a colour is only judgeable
 * against real content. A menu is not: it is a LIST, and a list shown at 81%
 * scale inside an iframe is the same list, smaller. So the shell's biggest
 * region goes to the thing being edited — the override list, at full size,
 * with room for the hidden/renamed/added rows to breathe.
 *
 * THE THREE COLUMNS
 *
 *   rail     which SET of menus (all / core / extensions / customised)
 *   panel    which MENU, found by typing
 *   space    that menu's items, and what has been done to them
 *
 * Each column narrows the one after it, which is the only arrangement where 34
 * menus never require scrolling past something irrelevant to reach something
 * relevant.
 *
 * WHAT IT SAVES: `save(["menuOverrides"])` — a PARTIAL write. This screen owns
 * one field of the chrome row and sends one field, so an owner editing the
 * footer in another tab does not have their work quietly replaced by whatever
 * this page happened to be holding. See use-chrome-draft.ts.
 */

import * as React from "react";
import {
  LayoutDashboard,
  ListTree,
  PencilLine,
  Puzzle,
  RotateCcw,
  Save,
  TriangleAlert,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SkeletonText } from "@/components/ui/skeleton";
import { OverrideEditor } from "@/components/admin/chrome/override-editor";
import {
  EDITABLE_MENUS,
  countCustomisedMenus,
  describeMenuChanges,
  isMenuCustomised,
  matchesQuery,
} from "@/components/admin/studio/menus-catalog";
import { MenusList } from "@/components/admin/studio/menus-list";
import {
  StudioShell,
  StudioStatus,
  type StudioSection,
} from "@/components/admin/studio/studio-shell";
import { useChromeDraft } from "@/components/admin/studio/use-chrome-draft";
import {
  EMPTY_MENU_OVERRIDE,
  isEmptyMenuOverride,
  type MenuOverride,
  type MenuOverrides,
} from "@/lib/chrome/menu-overrides";
import { useTranslations } from "next-intl";

type SectionId = "all" | "core" | "extensions" | "customised";

/**
 * The rail is the menu's own taxonomy, not a set of tools.
 *
 * "Customised" is grouped apart from the other three because it is a different
 * kind of question — the first three ask WHERE a menu lives, that one asks what
 * has been done to it, and it is the view an owner wants when they come back
 * later to find the edit they made last month.
 */
const SECTIONS: readonly StudioSection[] = [
  { id: "all", label: "All menus", icon: ListTree, group: "browse" },
  { id: "core", label: "Core", icon: LayoutDashboard, group: "browse" },
  { id: "extensions", label: "Extensions", icon: Puzzle, group: "browse" },
  { id: "customised", label: "Customised", icon: PencilLine, group: "review" },
];

const EMPTY_HINT: Record<SectionId, string> = {
  all: "This build ships no editable menus.",
  core: "This build ships no core menus.",
  extensions: "No extension in this build ships an editable menu.",
  customised: "Nothing is customised yet. Every menu is exactly as it ships.",
};

export function MenusStudio() {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const { loading, saving, error, errorKind, dirty, draft, update, discard, reload, save } =
    useChromeDraft();

  const [section, setSection] = React.useState<SectionId>("all");
  const [query, setQuery] = React.useState("");
  const [selectedScope, setSelectedScope] = React.useState(EDITABLE_MENUS[0]?.scope ?? "");

  const overrides = draft.menuOverrides;
  const busy = loading || saving;

  /**
   * The selection is held as a SCOPE, and falls back to the first menu rather
   * than to nothing. A scope can stop resolving mid-session — the catalogue is
   * a module constant, but a future build could drop an extension — and an
   * unresolvable selection must degrade to a usable screen, not an empty one.
   */
  const active = EDITABLE_MENUS.find((m) => m.scope === selectedScope) ?? EDITABLE_MENUS[0];
  const override: MenuOverride = overrides[active?.scope ?? ""] ?? EMPTY_MENU_OVERRIDE;

  const visible = React.useMemo(
    () =>
      EDITABLE_MENUS.filter((menu) => {
        if (section === "core" && menu.group !== "core") return false;
        if (section === "extensions" && menu.group !== "extensions") return false;
        if (section === "customised" && !isMenuCustomised(overrides[menu.scope])) return false;
        return matchesQuery(menu, query);
      }),
    [overrides, query, section]
  );

  const customisedCount = React.useMemo(() => countCustomisedMenus(overrides), [overrides]);

  /**
   * Typing searches EVERY menu, whichever section the rail is on.
   *
   * The alternative — filter within the current section — makes the first use
   * of the box a lie: an owner sitting on Core who types "stak" would be shown
   * "no matches" while Staking sits two sections away. Widening on the first
   * keystroke costs a section highlight and buys "type four letters, get there",
   * which is the entire reason this screen is not a `<select>`.
   */
  const onQueryChange = React.useCallback(
    (next: string) => {
      setQuery(next);
      if (next && section !== "all") setSection("all");
    },
    [section]
  );

  const setOverride = React.useCallback(
    (next: MenuOverride) => {
      if (!active) return;
      /**
       * An override reset to empty is DELETED from the map, never stored as an
       * empty object. Otherwise every menu the owner merely opened accumulates
       * a `{hidden:[],labels:{},…}` entry: the stored document grows without
       * anything having been customised, and every "is anything customised?"
       * check — this screen's counter, the renderer's fast path — answers yes
       * forever after.
       */
      const nextAll: MenuOverrides = { ...overrides };
      if (isEmptyMenuOverride(next)) delete nextAll[active.scope];
      else nextAll[active.scope] = next;
      update({ menuOverrides: nextAll });
    },
    [active, overrides, update]
  );

  const changes = describeMenuChanges(override);
  const customised = isMenuCustomised(override);

  /**
   * "No editable menus were found in this build" is a statement about the
   * BUILD, not about the request — `EDITABLE_MENUS` is a module constant, so
   * `active` is undefined only when this build genuinely ships none. That is
   * why this predicate carries no `!loading`, unlike every other empty guard in
   * this sweep: the fetch cannot change the answer.
   */
  const showNoMenus = !active;

  /**
   * Removing the `active ? … : null` gate removes the narrowing with it. The
   * branch above proves `active` is set here, so this is a type-level restatement
   * of that rather than a value substitution.
   */
  const menu = active ?? EDITABLE_MENUS[0];

  return (
    <StudioShell
      title="Menus"
      subtitle={t("hide_rename_reorder_and_add_items")}
      backHref="/admin"
      backLabel="Admin"
      sections={SECTIONS}
      activeSection={section}
      onSectionChange={(id) => setSection(id as SectionId)}
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
          {/* Only `menuOverrides` goes up. See the file header.

              In-flight state, house pattern: `loading` on the Button. It draws
              the design system's own `size-4` spinner into the leading slot and
              sets `aria-busy`, which the hand-rolled Loader2 swap did not. The
              Save icon steps aside while saving ON PURPOSE — the same exemption
              `components/auth/wallet-login-form.tsx` carries — because the
              spinner already occupies that slot. */}
          <Button
            size="2xs"
            className="gap-1.5"
            onClick={() => void save(["menuOverrides"])}
            loading={saving}
            disabled={!dirty || busy}
          >
            {!saving && <Save className="size-3.5" aria-hidden="true" />}
            Save
          </Button>
        </>
      }
      panel={
        <MenusList
          menus={visible}
          overrides={overrides}
          selectedScope={active?.scope ?? ""}
          onSelect={setSelectedScope}
          query={query}
          onQueryChange={onQueryChange}
          totalCount={EDITABLE_MENUS.length}
          customisedCount={customisedCount}
          emptyHint={EMPTY_HINT[section]}
          disabled={saving}
        />
      }
    >
      {/* The workspace ground is `background`, not the shell's `surface-2`.
          `surface-2` is LIGHTER than `card` in dark mode, so cards laid on it
          read as sunken and the elevation ramp runs backwards — and the editor
          below is a stack of `bg-card` panels. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
          {active ? (
            <>
              <h2 className="shrink-0 truncate text-xs font-semibold text-foreground">
                {active.label}
              </h2>
              <span className="shrink-0 rounded-sm bg-muted px-1 text-[10px] leading-4 text-muted-foreground">
                {active.surface}
              </span>
              {/* The stored key. An owner reading a support thread or an export
                  sees this string and nothing else, so the screen that writes
                  it shows it. */}
              <code className="hidden min-w-0 truncate font-mono text-[10px] text-subtle-foreground md:block">
                {active.scope}
              </code>
              <span className="hidden shrink-0 text-[10px] tabular-nums text-subtle-foreground lg:block">
                {active.itemCount} items
              </span>

              {/* `customised` is derived from the FETCHED override, so during
                  the read it is false and this used to print a confident
                  "Unchanged" about a menu the owner may well have customised —
                  the same class of claim the editor below refuses to make. The
                  status word takes a placeholder; the Reset button beside it
                  stays absent because offering to reset a menu whose overrides
                  have not arrived would reset them to whatever is in hand,
                  which is nothing. */}
              <div className="ms-auto flex shrink-0 items-center gap-2">
                {loading ? (
                  <span className="text-[11px] text-subtle-foreground">
                    <SkeletonText placeholder="Unchanged" />
                  </span>
                ) : customised ? (
                  <>
                    <span className="hidden text-[11px] text-muted-foreground sm:block">
                      {changes.join(" · ")}
                    </span>
                    <Button
                      size="2xs"
                      variant="outline"
                      className="gap-1.5"
                      disabled={busy}
                      aria-label={t("reset_to_default_1", { label: String(active.label) })}
                      onClick={() => setOverride(EMPTY_MENU_OVERRIDE)}
                    >
                      <RotateCcw className="size-3" aria-hidden="true" />
                      Reset
                    </Button>
                  </>
                ) : (
                  <span className="text-[11px] text-subtle-foreground">Unchanged</span>
                )}
              </div>
            </>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {/* Capped, because an override row is one line of text and a handful
              of icon buttons; run it to 2000px and the buttons end up a screen
              away from the label they act on.

              `5xl` and not `3xl`: the rail and panel already spend 388px, so at
              768px the list left ~250px of dead ground on EACH side of a
              workspace that is the whole point of the screen, while deep menu
              items — indented four levels with a long href beside them — were
              truncating. 1024px keeps the buttons within reach of their label
              and stops the page reading as mostly margin. */}
          <div className="mx-auto w-full max-w-5xl space-y-3">
            {error ? (
              <Alert tone="destructive">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>
                  {errorKind === "save"
                    ? t("your_changes_were_not_saved")
                    : t("could_not_load_the_saved_menus")}
                </AlertTitle>
                <AlertDescription>
                  <p className="break-words">{error}</p>
                  {errorKind === "save" ? (
                    /* NOT "could not reach the server". A refused save usually
                       means the server was reached perfectly well and declined
                       the write because somebody else had already changed this
                       row. Telling an owner their network is down sends them to
                       debug the one thing that is working. */
                    <p>
                      {t("the_server_was_reached_it_declined")}
                    </p>
                  ) : null}
                  <div>
                    <Button
                      variant="outline"
                      size="2xs"
                      className="mt-1"
                      onClick={() => void reload()}
                    >
                      {errorKind === "save" ? t("reload_settings") : tCommon("try_again")}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            {/*
              The spinner that used to sit here was written for a real reason —
              "the draft starts empty, so rendering the editor during the read
              would show every menu as unchanged for a beat and then flip" — and
              the reason was right while the only two options were a spinner or
              a lie. It is a third thing now.

              The MENU is `EDITABLE_MENUS`, a module constant: this build's
              shipped items, known before any request. Only the OVERRIDE is
              fetched. So the editor renders from the first frame with one row
              per shipped item at the row's real height, and `pending` withholds
              exactly the four things the override decides — the label, the
              hidden state, the Added/Renamed badges and every control. Nothing
              claims to be unchanged, because nothing claims anything.

              The measurement that makes this worth doing: the spinner was
              `py-16` plus a text line, about 148px, standing in for a list that
              runs 300-1200px depending on the menu. The whole workspace column
              resized under the cursor on every visit to this screen.
            */}
            {showNoMenus ? (
              <p className="py-16 text-center text-xs text-muted-foreground">
                {t("no_editable_menus_were_found_in_this_build")}
              </p>
            ) : (
              <OverrideEditor
                items={menu.items}
                override={override}
                onChange={setOverride}
                /* `busy`, not `saving`: a control that writes to a draft the
                   server has not delivered yet would be overwritten by the
                   response landing on top of it. */
                disabled={busy}
                pending={loading}
                /* Menus have somewhere to put one — the header dropdown prints
                   it under the label. The footer, the editor's other caller,
                   does not, which is why this is opt-in rather than the
                   default. */
                allowDescriptions
                emptyHint="This menu ships no items."
              />
            )}
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
