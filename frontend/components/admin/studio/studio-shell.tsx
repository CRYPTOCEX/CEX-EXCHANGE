"use client";

/**
 * The full-bleed editor shell shared by Site Design, Menus and Footer.
 * ============================================================================
 *
 * WHY A SHELL AND NOT THREE PAGES THAT LOOK SIMILAR
 *
 * These three screens are one tool split by subject matter. They share a save
 * model (draft vs saved, dirty, discard), a chrome (title bar, action cluster)
 * and a shape (a narrow rail of sections beside a working area). Built
 * separately they drift — different bar heights, different dirty affordances,
 * a Save that sits left on one and right on another — and the drift is the
 * thing that makes an admin area feel assembled rather than designed.
 *
 * THE LAYOUT, and why it is this one:
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │ ← Title · subtitle              status  actions  │  h-12
 *   ├────┬────────────────┬────────────────────────────┤
 *   │ ▣  │  panel         │  workspace                 │
 *   │ ◑  │  (scrolls)     │  (preview, or the editor)  │
 *   │ ⬡  │                │                            │
 *   └────┴────────────────┴────────────────────────────┘
 *     48       340px                fills
 *
 * A VERTICAL icon rail rather than a row of tabs. The previous version used a
 * horizontal `TabsList` and it capped out at five items — merging the theme and
 * chrome editors takes it to seven, and a seven-across icon strip in a 340px
 * column gives every target a 40px hit area with no room for a label. Vertical
 * costs 48px of width once and scales to as many sections as the tool grows,
 * with the label available on hover and to a screen reader at every size.
 *
 * The workspace is a SLOT, not a preview. Site Design fills it with the live
 * site; Menus and Footer fill it with the editor itself, because their subject
 * is a list and a list does not become clearer for being shown at 81% scale in
 * an iframe. Same shell, different centre of gravity.
 */

import * as React from "react";
import { Link } from "@/i18n/routing";
import { ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface StudioSection {
  id: string;
  /** Announced to screen readers and shown in the hover label. */
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Sections carrying the same group are drawn together, separated from the
   * next group by a rule. Purely visual — it is what stops seven icons reading
   * as one undifferentiated column.
   */
  group?: string;
}

export function StudioShell({
  title,
  subtitle,
  backHref = "/admin",
  backLabel = "Admin",
  onBack,
  sections,
  activeSection,
  onSectionChange,
  sectionBadge,
  status,
  actions,
  panel,
  panelWidth = "340px",
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  /**
   * Intercept the back link — for a studio holding unsaved work that has to ask
   * before it navigates. `beforeunload` cannot see an in-app route change, so a
   * studio without this can lose an edit to one click on its own header.
   */
  onBack?: () => void;
  sections: readonly StudioSection[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  /**
   * How many unsaved changes sit in a section. A single global "Unsaved" badge
   * cannot say WHERE, and behind a rail of nine that is the difference between
   * reviewing the change and saving in hope. Return 0 for none.
   */
  sectionBadge?: (id: string) => number;
  /** Saved / Unsaved / Loading — rendered at the start of the action cluster. */
  status?: React.ReactNode;
  actions?: React.ReactNode;
  /** The active section's controls. Scrolls independently. */
  panel: React.ReactNode;
  panelWidth?: string;
  /** The workspace: a live preview, or the editor itself. */
  children: React.ReactNode;
}) {
  const t = useTranslations("components");
  /* Grouped in render order, so the rail's reading order always matches the
     order the sections were declared in. */
  const groups = React.useMemo(() => {
    const out: StudioSection[][] = [];
    let currentGroup: string | undefined;
    for (const section of sections) {
      if (out.length === 0 || section.group !== currentGroup) {
        out.push([section]);
        currentGroup = section.group;
      } else {
        out[out.length - 1].push(section);
      }
    }
    return out;
  }, [sections]);

  const active = sections.find((s) => s.id === activeSection) ?? sections[0];

  return (
    /* `h-dvh`, not `h-screen`: on mobile Safari `100vh` is the tallest the
       viewport ever gets, so the action bar sits under the browser UI and Save
       cannot be tapped. */
    <div className="flex h-dvh min-h-[560px] flex-col overflow-hidden bg-surface-2">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
        {/* A real `<Link>` when nothing has to be asked, so middle-click and
            "open in new tab" keep working; a button when the studio needs to
            intervene, because a Link whose click is cancelled still shows a
            href the browser will happily follow by other means. */}
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ms-1 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            {backLabel}
          </button>
        ) : (
          <Link
            href={backHref}
            className="-ms-1 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {/* Logical, not physical: the chevron has to point at the start of
                the line, which is the RIGHT edge in Arabic and Farsi. */}
            <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            {backLabel}
          </Link>
        )}

        {/* `self-stretch`, not a fixed `h-4`.
            ------------------------------------------------------------------
            A 16px pill floating in a 48px bar reads as punctuation between two
            labels. The bar is genuinely divided here — everything before it is
            "leave", everything after is "this screen" — and the workspaces this
            shell is modelled on never draw a rule shorter than the thing it
            divides: in `trade/**` a division IS the container's own `border-b` /
            `border-e`, which by construction spans the whole edge.
            `align-self: stretch` overrides the header's `items-center` and does
            the same thing for a divider that has no container of its own. */}
        <div className="w-px shrink-0 self-stretch bg-border" aria-hidden="true" />

        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="hidden truncate text-xs text-muted-foreground md:block">{subtitle}</p>
          ) : null}
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-2">
          {status}
          {actions}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={t("sections", { title: String(title) })}
          className="flex w-12 shrink-0 flex-col items-center gap-1 border-e border-border bg-card py-2"
        >
          {/* Keyed on the group's FIRST SECTION, not on its `group` string: a
              rail may legitimately return to a group it has already used — the
              page editor's rail runs bands, then page-record settings — and two
              runs of the same name produced duplicate keys and a React warning.
              Section ids are unique by construction. */}
          {groups.map((group, groupIndex) => (
            <React.Fragment key={group[0]?.id ?? groupIndex}>
              {/* `self-stretch`, not `w-6`. A 24px line centred in a 48px rail
                  reads as a tick between two icons; the rail is divided across
                  its whole width, so the rule is too. Same argument as the
                  header divider above. */}
              {groupIndex > 0 ? (
                <div className="my-1 h-px self-stretch bg-border" aria-hidden="true" />
              ) : null}
              {group.map((section) => {
                const selected = section.id === active?.id;
                const changes = sectionBadge?.(section.id) ?? 0;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onSectionChange(section.id)}
                    aria-current={selected ? "true" : undefined}
                    title={
                      changes > 0
                        ? `${section.label} — ${changes} unsaved change${changes === 1 ? "" : "s"}`
                        : section.label
                    }
                    className={cn(
                      "group relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      selected
                        ? "bg-primary/10 text-primary-ink"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {/* The active marker is a rail on the LEADING edge, drawn
                        outside the button's own rounding so it reads as an
                        indicator rather than as part of the control. */}
                    <span
                      className={cn(
                        "absolute inset-y-1.5 -start-2 w-0.5 rounded-full bg-primary transition-opacity",
                        selected ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                    <section.icon className="h-4 w-4" />
                    {changes > 0 ? (
                      /* A dot, not a count: the rail is 48px and a two-digit
                         badge on a 36px target either shrinks the icon or
                         overflows the column. The number is in the tooltip and
                         in the screen-reader text, where it has room. */
                      <span
                        className="absolute end-1 top-1 size-1.5 rounded-full bg-primary ring-2 ring-card"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="sr-only">
                      {section.label}
                      {changes > 0
                        ? `, ${changes} unsaved change${changes === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        {/* Below `lg` the two columns STACK instead of squeezing. Side by side at
            768px the panel would take 340 of ~720 usable pixels and the
            workspace would be narrower than a phone — two unusable columns
            instead of one usable one. Stacked, the panel is capped so the
            workspace below it is always reachable without scrolling past a long
            list of controls. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
          <div
            className="flex max-h-[45vh] min-h-0 w-full flex-col border-b border-border bg-card lg:max-h-none lg:w-[var(--studio-panel)] lg:shrink-0 lg:border-b-0 lg:border-e"
            /* A custom property rather than an inline `width`, so the `lg:`
               variant can own the breakpoint. An inline width would apply at
               every size and defeat the stacking above. */
            style={{ "--studio-panel": panelWidth } as React.CSSProperties}
          >
            <div className="flex h-9 shrink-0 items-center border-b border-border px-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {active?.label}
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * The shared dirty indicator, so the three screens cannot word it differently.
 *
 * ONE `<Badge>`, three states. It used to be three separate `<Badge>` returns —
 * an early `if (loading)` and then a ternary — which is a full element swap
 * three times over for a control whose only differences are one word and one
 * tint. React reconciles a returned element by type and position, so three
 * literals at three return sites are three different elements: the pill
 * unmounts and remounts as the studio moves Loading -> Saved -> Unsaved,
 * throwing away any transition on the tint it changes.
 *
 * Nothing here takes a skeleton, and that is the point rather than an omission.
 * "Loading" is not a placeholder standing in for an unknown value — it IS this
 * widget's correct, meaningful content while the document is in flight. A
 * status pill whose job is to name the state has no pending state of its own.
 *
 * The three words are 7, 7 and 5 characters, so the pill narrows by roughly
 * 10px when it settles on "Saved". It sits first in an `ms-auto` cluster whose
 * right edge is pinned by the action buttons, so that width change moves the
 * pill itself and nothing else — no button shifts under a cursor already on
 * its way to Save.
 */
export function StudioStatus({
  loading,
  dirty,
}: {
  loading?: boolean;
  dirty: boolean;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const state: "loading" | "unsaved" | "saved" = loading
    ? "loading"
    : dirty
      ? "unsaved"
      : "saved";

  return (
    <Badge variant={state === "unsaved" ? "warning" : "muted"} size="xs">
      {state === "loading" ? tCommon("loading") : state === "unsaved" ? tCommon("unsaved") : tCommon("saved")}
    </Badge>
  );
}

/**
 * A labelled block inside a panel. Consistent rhythm across all four studios.
 *
 * `bleed` HANDS THE HORIZONTAL PADDING TO THE CHILDREN.
 * ----------------------------------------------------------------------------
 * A rule drawn inside a padded box stops 12px short of the panel on both sides,
 * so it reads as an underline belonging to the row above it rather than as a
 * division of the panel. Every workspace in the product draws them the other
 * way — `trade/components/markets/market-item.tsx` is the canonical one:
 * `border-b border-border px-2 py-2`, the padding and the border on the SAME
 * element, so the line runs edge to edge while the content stays inset.
 *
 * That is only expressible if the padding is on the row, so `bleed` removes it
 * from this container and the rows take it on. Opt-in, because the other three
 * studios are built out of blocks rather than lists and their content wants a
 * padded box.
 */
export function StudioGroup({
  title,
  hint,
  children,
  className,
  bleed = false,
}: {
  title?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Drop horizontal padding so child rows can draw full-width separators. */
  bleed?: boolean;
}) {
  return (
    <section
      className={cn(
        "border-b border-border py-3 last:border-b-0",
        bleed ? "px-0" : "px-3",
        className
      )}
    >
      {title ? (
        <h3
          className={cn(
            "mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground",
            bleed && "px-3"
          )}
        >
          {title}
        </h3>
      ) : null}
      {children}
      {hint ? (
        <p
          className={cn("mt-2 text-[11px] leading-snug text-muted-foreground", bleed && "px-3")}
        >
          {hint}
        </p>
      ) : null}
    </section>
  );
}
