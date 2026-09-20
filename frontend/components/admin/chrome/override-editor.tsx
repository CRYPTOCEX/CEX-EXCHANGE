"use client";

/**
 * The list editor behind both the menu tab and the footer-links tab.
 * ============================================================================
 *
 * ONE COMPONENT, TWO FEATURES, because a footer IS a two-level menu: sections
 * with links under them, generated from which extensions are installed. Same
 * data shape, same patch model, same failure if you get it wrong — so the same
 * editor, rather than two that drift.
 *
 * WHY IT SHOWS HIDDEN ITEMS
 *
 * The list is rendered from the shipped tree with ordering and custom items
 * applied but hiding NOT applied. An editor that hid what the override hides
 * would be an editor you cannot use to un-hide anything: the item vanishes on
 * the click that hides it and there is no control left to bring it back. So a
 * hidden row stays, struck through and dimmed, and its button says "Show".
 *
 * WHY BUTTONS AND NOT DRAG-AND-DROP
 *
 * Reordering is up/down buttons. Drag-and-drop would need a library, would need
 * a keyboard alternative built anyway to be usable at all, and would have to
 * handle dragging across nesting levels — which this model does not support
 * (an item's parent is where the shipped tree puts it). Two buttons express
 * exactly what the model can do, work on touch, and are operable from the
 * keyboard without extra code.
 *
 * WHAT MAY HOST AN ADDED ITEM
 *
 * "Add inside" lists every SHIPPED GROUP plus every item the admin has ADDED —
 * not only the groups. It used to list groups alone, derived from "does anything
 * currently sit under this key", and the consequence was that a top-level item
 * you had just created could not be given sub-items: it had no children yet, so
 * it was not a group, so it never appeared in its own parent list. The one thing
 * an admin building a new nav section wants to do second was the one thing the
 * dropdown would not offer.
 *
 * A shipped LEAF is still not offered, and that is not an oversight. The engine
 * splices added items into levels it walks, and it only walks a child collection
 * the item actually shipped with — so an item parented to a shipped leaf would
 * be stored, listed nowhere, and rendered nowhere. Offering a parent that
 * silently swallows the item is worse than not offering it.
 */

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loadable } from "@/components/ui/skeleton";
import {
  EMPTY_MENU_OVERRIDE,
  addCustom,
  applyMenuOverride,
  flattenMenu,
  moveWithinLevel,
  newCustomKey,
  removeCustom,
  resetItem,
  setDescription,
  setIcon,
  setLabel,
  toggleHidden,
  type MenuNodeLike,
  type MenuOverride,
} from "@/lib/chrome/menu-overrides";
import { Icon } from "@/components/ui/icon";
import { IconSelect } from "@/components/ui/icon-select";
import { safeFooterHref } from "@/components/partials/footer/use-footer-data";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const CUSTOM_PREFIX = "custom:";

export function OverrideEditor({
  items,
  override,
  onChange,
  disabled = false,
  allowCustom = true,
  allowDescriptions = false,
  emptyHint = "This menu has no items.",
  pending = false,
}: {
  items: MenuNodeLike[];
  override: MenuOverride;
  onChange: (next: MenuOverride) => void;
  disabled?: boolean;
  allowCustom?: boolean;
  /**
   * Offer the sub-line that the header dropdown prints under an item's label.
   *
   * OFF by default, because the other caller is the footer, and a footer link
   * has nowhere to put one — the columns render a label and an href and nothing
   * else. A description box there would accept text, save it, and show the
   * admin nothing, which is the failure this whole screen is built to avoid.
   */
  allowDescriptions?: boolean;
  emptyHint?: string;
  /**
   * The SHIPPED tree is known (it is a module constant) but the saved override
   * has not arrived yet.
   *
   * That distinction is what this flag exists for, and it is why the screen no
   * longer swaps itself for a spinner. Everything structural here — the warning
   * Alert, the bordered list, one row per shipped item at the row's real height,
   * the control cluster, the "Add item" button — comes from `items` and can be
   * drawn immediately. What CANNOT be drawn is anything the override decides:
   * the row's label, its position, whether it is hidden, whether it was renamed
   * or added. So while pending, each row's title renders as a placeholder sized
   * BY THE SHIPPED TITLE — exact geometry, no claim — and every control is
   * inert.
   *
   * Two honest caveats, stated rather than hidden: a menu carrying custom items
   * gains rows when the override lands, and a reordered menu re-sorts. Both are
   * rare, both are bounded by the list's own height, and both are a great deal
   * smaller than the 148px spinner that used to stand in for a 300-1200px list.
   */
  pending?: boolean;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [draftLabel, setDraftLabel] = React.useState("");
  const [draftDescription, setDraftDescription] = React.useState("");
  const [draftIcon, setDraftIcon] = React.useState("");
  /**
   * What the item says WITHOUT any override, captured when the editor opens.
   *
   * `commitEdit` writes every field it holds, and the drafts are seeded from
   * the shipped values — so pressing Save after changing nothing but the icon
   * stored the shipped title as a "rename". The row then wore a Renamed badge
   * nobody asked for, and worse, the stored label PINS that text: the item
   * would keep the old wording through a release that renamed it and through
   * every language the visitor might switch to, because an admin label opts out
   * of i18n by design. Comparing against this is what keeps "I set an icon"
   * from meaning "I froze the label".
   */
  const [draftBase, setDraftBase] = React.useState<{ title: string; description: string }>({
    title: "",
    description: "",
  });
  const [adding, setAdding] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newHref, setNewHref] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newIcon, setNewIcon] = React.useState("");
  const [newParent, setNewParent] = React.useState("");

  /**
   * The rows, in the order they will actually render — with hiding suppressed.
   *
   * Reusing `applyMenuOverride` rather than re-deriving order here is what stops
   * the editor and the site disagreeing about position. A second ordering
   * implementation is a second thing to get wrong, and the symptom would be an
   * admin dragging an item into place and the live site putting it elsewhere.
   */
  const rows = React.useMemo(() => {
    const visible = applyMenuOverride(items, { ...override, hidden: [] });
    return flattenMenu(visible);
  }, [items, override]);

  /**
   * What each item says with NO rename applied — the baseline `commitEdit`
   * compares a draft against.
   *
   * It cannot come from `rows`: those have the override applied (only hiding is
   * suppressed), so `row.title` is already the renamed text and comparing a
   * draft to it would read every real rename as "unchanged" and clear it on the
   * next save. This runs the same engine with the label and description maps
   * emptied, keeping `custom` so an ADDED item still resolves to the title it
   * was created with rather than to nothing.
   */
  const shipped = React.useMemo(() => {
    const bare = applyMenuOverride(items, {
      ...EMPTY_MENU_OVERRIDE,
      order: override.order,
      custom: override.custom,
    });
    const map = new Map<string, { title: string; description: string }>();
    for (const row of flattenMenu(bare)) {
      map.set(row.key, { title: row.title, description: row.description ?? "" });
    }
    return map;
  }, [items, override.custom, override.order]);

  /** Sibling order per level, for the move buttons. */
  const siblings = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.parent) ?? [];
      list.push(row.key);
      map.set(row.parent, list);
    }
    return map;
  }, [rows]);

  /**
   * What an added item may be parented to: shipped GROUPS, plus every ADDED
   * item whether or not anything sits under it yet. See the file header for why
   * a shipped leaf is excluded and a childless added item is not.
   *
   * `hasChildren` comes off the flattened SHIPPED shape rather than from "does
   * this key appear as somebody's parent in `rows`". The two agree today only
   * because `rows` is built with hiding suppressed; ask the same question on a
   * list where hiding applied and a group whose children are all hidden would
   * contribute no rows and quietly stop being a group.
   */
  const groups = React.useMemo(
    () =>
      rows
        .filter((r) => r.hasChildren || r.key.startsWith(CUSTOM_PREFIX))
        .map((r) => ({ key: r.key, title: r.title, depth: r.depth })),
    [rows]
  );

  /**
   * The parent actually in force, which is not always the one in state.
   *
   * The add form keeps its parent selection between adds — adding three links to
   * one section should not mean re-picking it three times — so the stored key
   * can outlive the item it names, once deleting an added parent became
   * possible. A `<select>` whose value matches no option displays the FIRST one,
   * so state and screen would then disagree and the item would be filed
   * somewhere the admin never chose. Deriving it makes the two impossible to
   * separate.
   */
  const parentValue =
    newParent && groups.some((g) => g.key === newParent) ? newParent : "";

  const hidden = React.useMemo(() => new Set(override.hidden), [override.hidden]);

  const commitEdit = React.useCallback(
    (key: string) => {
      /* Chained, not two `onChange` calls: the second would be computed from the
         `override` prop this render closed over — the pre-edit one — so saving a
         label and a description together would drop the label. */
      /* Blank clears the override, and an unchanged value is treated as blank
         for exactly that reason — see `draftBase`. */
      const label = draftLabel.trim() === draftBase.title.trim() ? "" : draftLabel;
      const description =
        draftDescription.trim() === draftBase.description.trim() ? "" : draftDescription;
      let next = setLabel(override, key, label);
      if (allowDescriptions) next = setDescription(next, key, description);
      /* Chained like the two above, and for the same reason. `setIcon` is the
         one writer for BOTH kinds of item: `applyMenuOverride` reads
         `o.icons[key] ?? item.icon`, so the override wins over whatever an
         added item was created with — which is what lets this one control edit
         a shipped item and an added one without knowing which it is holding. */
      next = setIcon(next, key, draftIcon);
      onChange(next);
      setEditingKey(null);
    },
    [allowDescriptions, draftBase, draftDescription, draftIcon, draftLabel, onChange, override]
  );

  const startEdit = React.useCallback(
    (row: { key: string; title: string; description?: string; icon?: string }) => {
      setEditingKey(row.key);
      setDraftLabel(override.labels[row.key] ?? row.title);
      setDraftDescription(override.descriptions?.[row.key] ?? row.description ?? "");
      /* Seeded from the override FIRST and the shipped tree second, so opening
         the editor on an item whose icon was changed shows the change rather
         than what it shipped with. */
      setDraftIcon(override.icons?.[row.key] ?? row.icon ?? "");
      /* The SHIPPED values, from `shipped` and never from `row` — see the memo
         for why the row's own title is the wrong baseline. */
      setDraftBase(shipped.get(row.key) ?? { title: row.title, description: row.description ?? "" });
    },
    [override, shipped]
  );

  /**
   * The link the renderer will actually accept, or `null`.
   *
   * `safeFooterHref` is imported rather than reimplemented — its own doc comment
   * asks for exactly that. Before this, the editor gated only on "non-empty", so
   * an admin could type `evil.com` or `javascript:…`, see it saved, see it
   * listed, and never see it on the site: the renderer runs the same function
   * and drops whatever fails. A rule enforced on one side only is a rule that
   * silently eats input.
   *
   * It is applied to MENU items too, not just footer links. The rule is the
   * right one for both — internal route, anchor, or an http/mailto/tel URL —
   * and a `javascript:` href in a navbar is no less dangerous than one in a
   * footer.
   */
  const hrefError = React.useMemo(() => {
    const raw = newHref.trim();
    if (!raw) return null;
    return safeFooterHref(raw)
      ? null
      : "Use a site path (/about), an anchor (#top), or a full https://, mailto: or tel: link.";
  }, [newHref]);

  const submitCustom = React.useCallback(() => {
    const title = newTitle.trim();
    const href = safeFooterHref(newHref);
    if (!title || !href) return;
    const description = allowDescriptions ? newDescription.trim() : "";
    const parentRows = siblings.get(parentValue) ?? [];
    onChange(
      addCustom(override, {
        key: newCustomKey(),
        parent: parentValue,
        title,
        href,
        /* `undefined`, never `""`. An empty string is a stored field that means
           nothing, and it survives every round trip — see `asCustomItems`. */
        description: description || undefined,
        /* `undefined` when unset, same rule as the description: an added item
           carrying `icon: ""` is a stored field that means nothing and survives
           every round trip. */
        icon: newIcon.trim() || undefined,
        /* Appended, not inserted at 0: an admin adding a link expects it at the
           end of the group they picked, and the index is clamped on render
           anyway if the group later shrinks. A parent that has nothing under it
           yet — an item added moments ago — gives 0, which is correct rather
           than a fallback. */
        index: parentRows.length,
      })
    );
    setNewTitle("");
    setNewHref("");
    setNewDescription("");
    setNewIcon("");
    setAdding(false);
  }, [
    allowDescriptions,
    newDescription,
    newHref,
    newIcon,
    newTitle,
    onChange,
    override,
    parentValue,
    siblings,
  ]);

  if (rows.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-muted-foreground">{emptyHint}</p>;
  }

  /* One name for "no control on this screen may be operated". `pending` is
     folded in here rather than at each of the eight call sites below, so a
     control added later inherits the guard instead of forgetting it. */
  const inert = disabled || pending;

  return (
    <div className="space-y-3" aria-busy={pending || undefined}>
      {/* The one thing an admin must not misunderstand about this screen. It is
          an Alert rather than helper text because "hidden" reads as "secured"
          to almost everyone, and shipping an admin page that quietly implies
          otherwise is how people publish pages they think are private. */}
      <Alert tone="info">
        <EyeOff aria-hidden="true" />
        <AlertDescription>
          {/* ONE `<p>`, not bare text with inline markup in it. `AlertDescription`
              is `grid gap-1`, so every child node — including a text node and an
              adjacent `<em>` — becomes its own grid ROW. Written inline, this
              sentence rendered as three stacked lines with the comma orphaned at
              the start of one of them. */}
          <p>
            Hiding an item removes the <em>link</em>, not access to the page — the URL still
            works for anyone whose role permits it. Permissions are enforced by the API and
            are not editable here.
          </p>
        </AlertDescription>
      </Alert>

      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {rows.map((row) => {
          const isHidden = hidden.has(row.key);
          const isCustom = row.key.startsWith(CUSTOM_PREFIX);
          const isRenamed = row.key in override.labels;
          const isDescribed = !!override.descriptions && row.key in override.descriptions;
          const level = siblings.get(row.parent) ?? [];
          const at = level.indexOf(row.key);
          const isEditing = editingKey === row.key;

          return (
            <li
              key={row.key}
              className={cn("flex items-center gap-2 px-2 py-1.5", isHidden && "opacity-55")}
              style={{ paddingInlineStart: `${8 + row.depth * 18}px` }}
            >
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      {/* Ahead of the label box, in the position the glyph
                          occupies in the rendered nav — so the control is
                          where the thing it changes will be. */}
                      <IconSelect
                        size="2xs"
                        value={draftIcon}
                        onChange={setDraftIcon}
                        disabled={inert}
                      />
                      <Input
                        autoFocus
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(row.key);
                          if (e.key === "Escape") setEditingKey(null);
                        }}
                        placeholder={row.title}
                        className="h-7 text-sm"
                        aria-label={t("label_for", { title: String(row.title) })}
                      />
                      <Button size="sm" className="h-7" onClick={() => commitEdit(row.key)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => setEditingKey(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                    {/* Second line rather than a second column: the label box is
                        already sharing its row with two buttons, and a
                        description is the longer of the two strings. Emptying it
                        clears the override — `setDescription` treats blank as
                        "use whatever ships", exactly as the label box does. */}
                    {allowDescriptions ? (
                      <Input
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(row.key);
                          if (e.key === "Escape") setEditingKey(null);
                        }}
                        placeholder={row.description || t("description_optional")}
                        className="h-7 text-sm"
                        aria-label={t("description_for", { title: String(row.title) })}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {/* No `fallback`. A stored name that does not resolve has
                          to read here exactly as it reads in the nav — as
                          nothing — or the editor promises a glyph the site
                          cannot draw. */}
                      {row.icon ? (
                        <Icon icon={row.icon} className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : null}
                      {/* The placeholder IS the shipped title, so the box it
                          reserves is the exact box the label will occupy for
                          every item that has not been renamed — which is nearly
                          all of them. What is withheld is the CLAIM: a rename
                          would put different text here, and printing the shipped
                          name for a beat is what the spinner was there to
                          prevent. */}
                      <span
                        className={cn(
                          "truncate text-sm text-foreground",
                          isHidden && "line-through"
                        )}
                      >
                        <Loadable loading={pending} placeholder={row.title}>
                          {row.title}
                        </Loadable>
                      </span>
                      {isCustom ? (
                        <Badge variant="muted" size="xs">
                          Added
                        </Badge>
                      ) : null}
                      {isRenamed ? (
                        <Badge variant="muted" size="xs">
                          Renamed
                        </Badge>
                      ) : null}
                      {row.href ? (
                        <span className="truncate text-[11px] text-subtle-foreground">
                          {/* From the SHIPPED tree, not the override — a saved
                              override cannot change an existing item's href, only
                              add new items — so this is knowable now and renders
                              unguarded. */}
                          {row.href}
                        </span>
                      ) : null}
                    </div>
                    {/* Printed, not just badged. A description is the one edit on
                        this screen with nothing else on the row to show for it —
                        a rename changes the title above, a hide strikes it
                        through — so without this the only feedback for typing one
                        would be a word in a chip. It takes the same `Loadable`
                        treatment as the title because, unlike the href, the
                        override CAN change it. */}
                    {allowDescriptions && row.description ? (
                      <p className="truncate text-[11px] text-subtle-foreground">
                        <Loadable loading={pending} placeholder={row.description}>
                          {row.description}
                        </Loadable>
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center">
                <IconButton
                  label={t("move_up_1", { title: String(row.title) })}
                  disabled={inert || at <= 0}
                  onClick={() => onChange(moveWithinLevel(override, row.parent, level, row.key, -1))}
                >
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={t("move_down_1", { title: String(row.title) })}
                  disabled={inert || at < 0 || at >= level.length - 1}
                  onClick={() => onChange(moveWithinLevel(override, row.parent, level, row.key, 1))}
                >
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
                <IconButton
                  /* The name follows what the panel actually contains. On the
                     footer it opens one box and "Rename" is the whole truth;
                     here it opens two, and a control announced as "Rename" that
                     also edits the description is a control a screen-reader user
                     has no reason to open. */
                  label={
                    allowDescriptions ? t("edit", { title: String(row.title) }) : t("rename", { title: String(row.title) })
                  }
                  disabled={inert}
                  onClick={() => startEdit(row)}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>

                {isCustom ? (
                  <IconButton
                    /* Deleting an added GROUP takes its added children with it —
                       `removeCustom` cascades, because a child left behind
                       renders nowhere and shows no row here, yet still counts as
                       a customisation. */
                    label={t("delete", { title: String(row.title) })}
                    disabled={inert}
                    onClick={() => onChange(removeCustom(override, row.key))}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                ) : (
                  <IconButton
                    label={isHidden ? t("show", { title: String(row.title) }) : t("hide", { title: String(row.title) })}
                    disabled={inert}
                    onClick={() => onChange(toggleHidden(override, row.key))}
                  >
                    {isHidden ? (
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </IconButton>
                )}

                {/* Offered for added items too, now that a rename actually
                    applies to them — before, `labels["custom:…"]` was written
                    but ignored, so there was nothing to reset. */}
                {isHidden || isRenamed || isDescribed || row.key in override.icons ? (
                  <IconButton
                    label={t("reset_to_default", { title: String(row.title) })}
                    disabled={inert}
                    onClick={() => onChange(resetItem(override, row.key))}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {allowCustom ? (
        adding ? (
          <div className="space-y-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <IconSelect value={newIcon} onChange={setNewIcon} disabled={inert} />
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Label"
                aria-label={t("new_item_label")}
                className="h-8 flex-1 text-sm"
              />
            </div>
            <Input
              value={newHref}
              onChange={(e) => setNewHref(e.target.value)}
              placeholder="/link or https://example.com"
              aria-label={t("new_item_link")}
              aria-invalid={hrefError ? true : undefined}
              aria-describedby={hrefError ? "chrome-href-error" : undefined}
              className="h-8 text-sm"
            />
            {hrefError ? (
              <p id="chrome-href-error" className="text-[11px] text-destructive-ink">
                {hrefError}
              </p>
            ) : null}
            {allowDescriptions ? (
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                aria-label={t("new_item_description")}
                className="h-8 text-sm"
              />
            ) : null}
            <select
              value={parentValue}
              onChange={(e) => setNewParent(e.target.value)}
              aria-label={t("add_inside")}
              className="h-8 w-full rounded-lg border border-input bg-card px-2 text-sm text-foreground"
            >
              <option value="">{t("top_level")}</option>
              {groups.map((g) => (
                <option key={g.key} value={g.key}>
                  {/* Indented by depth, because the list now mixes shipped groups
                      with added ones nested inside them and two entries can carry
                      the same label. A flat list of quoted names cannot say which
                      "Docs" is the one under "Marketplace".

                      The pad character is U+00A0. `<option>` text collapses
                      white-space like any other text node, so a run of ordinary
                      spaces renders as exactly one and the indent vanishes. */}
                  {" ".repeat(g.depth * 2)}{t("inside")}{g.title}”
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={submitCustom}
                disabled={inert || !newTitle.trim() || !newHref.trim() || !!hrefError}
              >
                {tCommon("add_item")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("added_items_are_shown_to_everyone")}
              {allowDescriptions
                ? t("anything_you_add_can_then_be")
                : null}
            </p>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5"
            onClick={() => setAdding(true)}
            disabled={inert}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {tCommon("add_item")}
          </Button>
        )
      ) : null}
    </div>
  );
}

/** A square icon control with a real accessible name. */
function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
