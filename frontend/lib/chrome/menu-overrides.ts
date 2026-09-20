/**
 * Admin menu overrides — the three-layer menu model.
 * ============================================================================
 *
 *     SHIPPED (code)  ->  OVERRIDE (database)  ->  RESOLVED (what renders)
 *
 * THE PROBLEM THIS SHAPE EXISTS TO SOLVE
 *
 * The obvious design is to let an admin edit the menu and store the result: a
 * full tree of items, replacing the one in code. It is simpler, it is what a
 * menu editor looks like, and it is wrong — because the shipped menu is not
 * static. Extensions add entries, updates add entries, and a stored SNAPSHOT
 * silently freezes the menu at the version it was taken from. Install a new
 * addon and its pages exist but are unreachable, with nothing anywhere saying
 * why. The usual patch for that is "reseed on update", which throws away every
 * edit the admin made. Neither is acceptable, and you cannot have both with a
 * snapshot.
 *
 * So nothing here stores a menu. It stores a PATCH keyed by the shipped item's
 * `key`, and the resolution rule is: an item nobody mentioned is unchanged. A
 * new shipped item is, by definition, not mentioned — so it appears, in its
 * shipped position, without the admin doing anything and without their edits
 * being touched. An entry for a key that no longer exists is inert rather than
 * an error, so uninstalling an addon does not corrupt the override.
 *
 * WHAT CANNOT BE OVERRIDDEN, AND WHY
 *
 * `permission`. Not "is not currently" — must never be. Hiding an item here is
 * COSMETIC: it removes a link, not access. The route behind it still enforces
 * its own `access.*` check server-side, which is the actual boundary. If this
 * file let an admin attach permissions to menu items, two things would follow —
 * the menu would start to look like an access-control surface (it is not, and
 * treating it as one is how people ship "hidden" admin pages that anyone can
 * reach by typing the URL), and an admin could lock themselves out of the menu
 * that contains the editor. The editor UI says this out loud next to the hide
 * control; it is not a detail to bury in a tooltip.
 *
 * ON TITLES: `key` IS the translation path in this codebase — dashes become
 * dots, so `admin-analytics` resolves `menu.admin.analytics.title` in all 90
 * locales. An admin-set label cannot participate in that, so it is applied as a
 * literal AND flagged with `_customTitle`, which is the existing contract
 * `getMenu` already uses for addon aliases (see `applyAliases`). Without the
 * flag the translator looks up a key that will never exist and logs a missing
 * translation on every render. Renaming an item in the editor therefore opts it
 * out of translation — stated in the UI, because for a multi-language site that
 * is a real trade and not an implementation detail.
 */

/** A node this engine can walk. Structural, so it fits `MenuItem` unchanged. */
export interface MenuNodeLike {
  key: string;
  title?: string;
  href?: string;
  icon?: string;
  child?: MenuNodeLike[];
  megaMenu?: MenuNodeLike[];
  [extra: string]: unknown;
}

/**
 * An item the admin added that has no shipped counterpart.
 *
 * `key` is namespaced with `custom:` so it can never collide with a shipped key
 * — including one a future release introduces. A collision would make the
 * override ambiguous: hiding "reports" would hide either the shipped item or
 * the custom one depending on walk order.
 */
export interface CustomMenuItem {
  key: string;
  /**
   * Key of the parent group, or `""` for the top level.
   *
   * Usually a SHIPPED key, but another `custom:` key is valid and supported —
   * that is what lets an admin add a top-level item of their own and then hang
   * sub-items under it. See `makeNode` in `applyMenuOverride`.
   */
  parent: string;
  title: string;
  href: string;
  /**
   * The sub-line the header dropdown prints under the label. Optional, and
   * omitted rather than blanked when unset — an empty string would make the
   * renderer draw an empty `<p>` under every item that has no description.
   */
  description?: string;
  icon?: string;
  /** Desired position among its siblings. Clamped, never trusted. */
  index: number;
}

/** The patch applied to ONE menu. */
export interface MenuOverride {
  /** Shipped keys to remove, with their subtrees. */
  hidden: string[];
  /** Shipped key -> admin label. Applied literally, opts out of i18n. */
  labels: Record<string, string>;
  /**
   * Shipped key -> admin description, the sub-line the header dropdown prints
   * under the label. Applied literally and opted out of i18n exactly the way
   * `labels` is — see `_customDescription`.
   *
   * Separate from `CustomMenuItem.description` on purpose, and it WINS over it.
   * That is the same relationship `labels` has with `CustomMenuItem.title`, and
   * it is what lets one code path edit the description of a shipped item and an
   * added one without the editor having to know which kind it is holding.
   */
  descriptions: Record<string, string>;
  /** Shipped key -> icon id. */
  icons: Record<string, string>;
  /**
   * Parent key (`""` = top level) -> the order its children should take.
   *
   * PARTIAL BY DESIGN. Keys listed here come first, in this order; every other
   * child follows in its shipped order. That is what lets a new shipped item
   * land at the end of its group instead of vanishing because it was missing
   * from a stored ordering.
   */
  order: Record<string, string[]>;
  custom: CustomMenuItem[];
}

/** Every menu's patch, keyed by scope (`admin`, `user`, `ext_staking`, …). */
export type MenuOverrides = Record<string, MenuOverride>;

export const EMPTY_MENU_OVERRIDE: MenuOverride = Object.freeze({
  hidden: [],
  labels: {},
  descriptions: {},
  icons: {},
  order: {},
  custom: [],
}) as MenuOverride;

/* -------------------------------------------------------------------------
   Normalisation

   Everything here crosses an HTTP boundary and is read on every render of
   every page, so it is never trusted. A malformed field degrades to its empty
   value INDEPENDENTLY — a garbage `order` must not cost the admin their
   `hidden` list, because the visible result of that would be hidden menu items
   reappearing with no explanation.
   ---------------------------------------------------------------------- */

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return out;
}

function asCustomItems(value: unknown): CustomMenuItem[] {
  if (!Array.isArray(value)) return [];
  const out: CustomMenuItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const key = typeof item.key === "string" ? item.key : "";
    const title = typeof item.title === "string" ? item.title : "";
    const href = typeof item.href === "string" ? item.href : "";
    /* All three are load-bearing: an item with no key cannot be addressed by
       the rest of the override, and one with no title or href renders as an
       invisible dead link the admin cannot find to delete. */
    if (!key || !title || !href) continue;
    /* Trimmed to nothing is treated as absent, not as an empty description —
       a blank string is truthy enough for a `?? c.description` chain and would
       print an empty line under the item in the dropdown. */
    const description =
      typeof item.description === "string" && item.description.trim()
        ? item.description.trim()
        : undefined;
    out.push({
      key,
      parent: typeof item.parent === "string" ? item.parent : "",
      title,
      href,
      description,
      icon: typeof item.icon === "string" ? item.icon : undefined,
      index: Number.isFinite(item.index) ? Number(item.index) : Number.MAX_SAFE_INTEGER,
    });
  }
  return out;
}

export function normalizeMenuOverride(raw: unknown): MenuOverride {
  const input = (raw ?? {}) as Record<string, unknown>;
  const order: Record<string, string[]> = {};
  if (input.order && typeof input.order === "object" && !Array.isArray(input.order)) {
    for (const [parent, keys] of Object.entries(input.order as Record<string, unknown>)) {
      const list = asStringArray(keys);
      if (list.length) order[parent] = list;
    }
  }
  return {
    hidden: asStringArray(input.hidden),
    labels: asStringRecord(input.labels),
    descriptions: asStringRecord(input.descriptions),
    icons: asStringRecord(input.icons),
    order,
    custom: asCustomItems(input.custom),
  };
}

export function normalizeMenuOverrides(raw: unknown): MenuOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: MenuOverrides = {};
  for (const [scope, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!scope) continue;
    out[scope] = normalizeMenuOverride(value);
  }
  return out;
}

/** Is this override a no-op? Lets callers skip the walk entirely. */
export function isEmptyMenuOverride(o: MenuOverride | undefined): boolean {
  if (!o) return true;
  return (
    o.hidden.length === 0 &&
    Object.keys(o.labels).length === 0 &&
    Object.keys(o.descriptions ?? {}).length === 0 &&
    Object.keys(o.icons).length === 0 &&
    Object.keys(o.order).length === 0 &&
    o.custom.length === 0
  );
}

/* -------------------------------------------------------------------------
   Resolution
   ---------------------------------------------------------------------- */

/**
 * Order a level: listed keys first in the given order, then the rest as shipped.
 *
 * Deliberately tolerant of a bad `order` array — duplicates are collapsed and
 * keys that are not at this level are ignored — because the alternative is
 * dropping or duplicating menu items on the strength of a stale stored value.
 */
function orderLevel<T extends MenuNodeLike>(items: T[], desired: string[] | undefined): T[] {
  if (!desired || desired.length === 0) return items;

  const byKey = new Map<string, T>();
  for (const item of items) byKey.set(item.key, item);

  const out: T[] = [];
  const taken = new Set<string>();
  for (const key of desired) {
    const item = byKey.get(key);
    if (!item || taken.has(key)) continue;
    out.push(item);
    taken.add(key);
  }
  /* Everything the stored order did not mention keeps its shipped position,
     AFTER the explicitly ordered items. This is the clause that makes a newly
     shipped menu entry appear on its own. */
  for (const item of items) {
    if (!taken.has(item.key)) out.push(item);
  }
  return out;
}

/**
 * Splice the admin's own items into a level.
 *
 * `index` is clamped rather than validated: a custom item recorded at position
 * 7 in a group that has since shrunk to 3 belongs at the end, not nowhere.
 */
function insertCustom<T extends MenuNodeLike>(
  items: T[],
  custom: CustomMenuItem[],
  makeNode: (c: CustomMenuItem) => T
): T[] {
  if (custom.length === 0) return items;
  const out = [...items];
  /* Ascending, so earlier insertions do not shift later ones off the end. */
  const sorted = [...custom].sort((a, b) => a.index - b.index);
  for (const c of sorted) {
    const at = Math.max(0, Math.min(out.length, Math.trunc(c.index)));
    out.splice(at, 0, makeNode(c));
  }
  return out;
}

/**
 * Apply an override to a shipped menu tree.
 *
 * Pure and non-mutating: `getMenu` hands out arrays that consumers memoise, and
 * mutating the shipped module-level constant would make the override permanent
 * for the life of the process — the second call would see an already-patched
 * tree and patch it again.
 */
export function applyMenuOverride<T extends MenuNodeLike>(
  items: T[],
  override: MenuOverride | undefined
): T[] {
  if (!Array.isArray(items) || items.length === 0) return items;
  if (isEmptyMenuOverride(override)) return items;
  const o = override as MenuOverride;

  const hidden = new Set(o.hidden);
  /* Read through a local rather than off `o` directly. `descriptions` is newer
     than the rest of the shape, and a document stored before it existed — or
     one that reached here without going through `normalizeMenuOverride` — has
     no such key. `o.descriptions[key]` on that document is a TypeError inside
     the root layout's SSR, i.e. a 500 on every route, in exchange for a menu
     sub-line. The type says it is always present; this says it survives being
     wrong. */
  const descriptions = o.descriptions ?? {};
  const customByParent = new Map<string, CustomMenuItem[]>();
  for (const c of o.custom) {
    const list = customByParent.get(c.parent) ?? [];
    list.push(c);
    customByParent.set(c.parent, list);
  }

  /**
   * Build an added item — including any added items parented to IT.
   *
   * `walk` only recurses into nodes that SHIPPED with a child array, so without
   * this a custom item whose parent is another custom item was never inserted
   * anywhere: it did not render, and it did not error. The current editor does
   * not offer a custom item as a parent, so nothing produces that shape today —
   * but a stored override can already contain it, and "silently loses data that
   * is validly in the document" is not a thing to leave lying in an engine.
   *
   * `seen` breaks cycles. A hand-edited or corrupted override can say A is
   * inside B and B is inside A, and unbounded recursion here is a blank page,
   * not a wrong menu.
   */
  const makeNode = (c: CustomMenuItem, seen: ReadonlySet<string> = new Set()): T => {
    const nested = seen.has(c.key) ? [] : (customByParent.get(c.key) ?? []);
    const children = nested.length
      ? [...nested]
          .sort((a, b) => a.index - b.index)
          .map((child) => makeNode(child, new Set([...seen, c.key])))
      : undefined;
    /* Same precedence as `labels` over `title`: an edit made later in the
       editor beats the value the item was created with. */
    const description = descriptions[c.key] ?? c.description;
    return {
      key: c.key,
      /* `labels` wins over the item's own title. Custom nodes are spliced in
         AFTER the loop that applies labels, so without this a rename of an
         added item was written to the override, badged "Renamed" by the editor,
         and then silently ignored by every renderer. */
      title: o.labels[c.key] ?? c.title,
      href: c.href,
      icon: o.icons[c.key] ?? c.icon,
      /* An admin-authored label has no translation key, so it must opt out of
         i18n exactly the way addon aliases already do. */
      _customTitle: true,
      /* Omitted when unset, never `description: ""`. The dropdown tests the
         field for truthiness before drawing the sub-line, and an empty string
         is falsy — but `undefined` also survives `JSON.stringify` as an absent
         key, which keeps the stored document from growing a dead field per
         added item. */
      ...(description ? { description, _customDescription: true } : {}),
      /* Omitted entirely when there are none, so a childless added item stays
         `{...}` without a `child: []` — the empty array is exactly what makes
         downstream draw a dropdown with nothing in it. */
      ...(children ? { child: children } : {}),
    } as unknown as T;
  };

  const walk = (level: T[], parentKey: string): T[] => {
    const kept: T[] = [];

    for (const item of level) {
      if (hidden.has(item.key)) continue;

      const next = { ...item } as T;

      const label = o.labels[item.key];
      if (label) {
        (next as MenuNodeLike).title = label;
        (next as MenuNodeLike)._customTitle = true;
      }

      /* Same contract as `labels`, one field over: written literally, and
         flagged so the translator stops looking for a key that will never
         exist. See `_customDescription` on `MenuItem`. */
      const description = descriptions[item.key];
      if (description) {
        (next as MenuNodeLike).description = description;
        (next as MenuNodeLike)._customDescription = true;
      }

      const icon = o.icons[item.key];
      if (icon) (next as MenuNodeLike).icon = icon;

      /* Both child collections are walked. `megaMenu` is what the public site
         header renders and `child` is what the dashboard sidebar renders; an
         engine that only knew about `child` would silently refuse to edit the
         entire public navigation, which is the menu most owners want to edit. */
      const hadChildren =
        (Array.isArray(item.child) && item.child.length > 0) ||
        (Array.isArray(item.megaMenu) && item.megaMenu.length > 0);

      if (Array.isArray(item.child)) {
        (next as MenuNodeLike).child = walk(item.child as T[], item.key);
      }
      if (Array.isArray(item.megaMenu)) {
        (next as MenuNodeLike).megaMenu = walk(item.megaMenu as T[], item.key);
      }

      /**
       * A container whose children have ALL been hidden must not survive as an
       * empty one.
       *
       * `getMenu`'s own filter already enforces this a step earlier — an item
       * with children but no SURVIVING children is dropped — precisely so an
       * empty group never reaches the bar. Applying an override afterwards
       * re-created the state that check exists to prevent: the header computes
       * `hasDropdown` from `child.length`, so an emptied group lost its chevron
       * and its dropdown and fell through to `<Link href={item.href || "#"}>`.
       * Three top-level user-menu groups have no `href` at all, so they rendered
       * as dead links to `#`.
       *
       * An emptied container that DOES have an href keeps its place as a plain
       * link — that is a real destination, not a dead end — but its child arrays
       * are cleared so nothing downstream draws an empty dropdown for it.
       */
      const stillHasChildren =
        ((next as MenuNodeLike).child?.length ?? 0) > 0 ||
        ((next as MenuNodeLike).megaMenu?.length ?? 0) > 0;

      if (hadChildren && !stillHasChildren) {
        if (!item.href) continue;
        delete (next as MenuNodeLike).child;
        delete (next as MenuNodeLike).megaMenu;
      }

      kept.push(next);
    }

    /**
     * Custom items are spliced in BEFORE ordering, so an explicit order can
     * position them.
     *
     * The other way round, `order` only ever saw shipped keys: the editor's move
     * buttons wrote a level order containing `custom:` keys, `orderLevel`
     * discarded them as "not at this level", and the added item snapped back to
     * wherever its stored `index` put it. Two dead buttons, no error.
     */
    const withCustom = insertCustom(kept, customByParent.get(parentKey) ?? [], makeNode);
    return orderLevel(withCustom, o.order[parentKey]);
  };

  return walk(items, "");
}

/* -------------------------------------------------------------------------
   Editing helpers

   Pure, non-mutating transitions on an override. They live here rather than in
   the editor component so they can be tested directly: every one of them is a
   place where a wrong answer is invisible in the UI (an edit that silently does
   not persist looks exactly like an edit that does, until the page reloads).
   ---------------------------------------------------------------------- */

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

export function toggleHidden(o: MenuOverride, key: string): MenuOverride {
  const hidden = o.hidden.includes(key)
    ? o.hidden.filter((k) => k !== key)
    : [...o.hidden, key];
  return { ...o, hidden };
}

/** Empty or whitespace clears the rename rather than storing a blank label. */
export function setLabel(o: MenuOverride, key: string, label: string): MenuOverride {
  const trimmed = label.trim();
  return trimmed
    ? { ...o, labels: { ...o.labels, [key]: trimmed } }
    : { ...o, labels: withoutKey(o.labels, key) };
}

/**
 * Set the sub-line under an item's label. Empty clears it.
 *
 * Clearing REMOVES the key rather than storing `""`, for the same reason
 * `setLabel` does: a stored empty string is a customisation as far as
 * `isEmptyMenuOverride` can tell, so a menu whose only edit was a description
 * the admin then deleted would stay badged "customised" forever, with the
 * scope-wide Reset button the only way out.
 */
export function setDescription(o: MenuOverride, key: string, description: string): MenuOverride {
  const trimmed = description.trim();
  const current = o.descriptions ?? {};
  return trimmed
    ? { ...o, descriptions: { ...current, [key]: trimmed } }
    : { ...o, descriptions: withoutKey(current, key) };
}

export function setIcon(o: MenuOverride, key: string, icon: string): MenuOverride {
  const trimmed = icon.trim();
  return trimmed
    ? { ...o, icons: { ...o.icons, [key]: trimmed } }
    : { ...o, icons: withoutKey(o.icons, key) };
}

/** Drop every customisation of one item, returning it to its shipped state. */
export function resetItem(o: MenuOverride, key: string): MenuOverride {
  return {
    ...o,
    hidden: o.hidden.filter((k) => k !== key),
    labels: withoutKey(o.labels, key),
    descriptions: withoutKey(o.descriptions ?? {}, key),
    icons: withoutKey(o.icons, key),
  };
}

/**
 * Move an item one place within its level.
 *
 * `siblingKeys` is the level's CURRENT RESOLVED order, which the caller already
 * has because it renders it. Recomputing it here from the shipped tree would
 * reorder against the wrong baseline the moment any previous move existed, so
 * the first click would appear to work and the second would jump.
 *
 * Writing the whole level's order (not just the moved pair) is deliberate: a
 * partial order is what lets NEW shipped items still appear, and they append
 * after the explicit list — see `orderLevel`.
 */
export function moveWithinLevel(
  o: MenuOverride,
  parentKey: string,
  siblingKeys: string[],
  key: string,
  delta: -1 | 1
): MenuOverride {
  const from = siblingKeys.indexOf(key);
  if (from < 0) return o;
  const to = from + delta;
  if (to < 0 || to >= siblingKeys.length) return o;
  const next = [...siblingKeys];
  [next[from], next[to]] = [next[to], next[from]];
  return { ...o, order: { ...o.order, [parentKey]: next } };
}

export function addCustom(o: MenuOverride, item: CustomMenuItem): MenuOverride {
  return { ...o, custom: [...o.custom, item] };
}

/**
 * Delete an added item, everything added INSIDE it, and everything else that
 * referenced any of them.
 *
 * Dropping it from `custom` alone left its label, icon and position behind.
 * Those are unreachable (no row renders for a deleted item, so nothing can
 * clear them), and `isEmptyMenuOverride` counts them — so deleting the only
 * customisation left the scope permanently badged "customised", with a "Reset
 * to default" button that was the only way out.
 *
 * THE CASCADE exists because the editor now offers an added item as a parent.
 * A child whose parent is gone is not merely orphaned, it is INVISIBLE:
 * `applyMenuOverride` only splices custom items into levels it actually walks,
 * and it never walks a level belonging to a key that is not in the tree. So the
 * sub-item would stop rendering, keep no row in the editor, and go on counting
 * as a customisation — the exact state described above, one level down.
 *
 * Iterative rather than recursive, and bounded by the number of custom items:
 * `custom` can carry a cycle (hand-edited, or a document from a client that did
 * not guard) and a recursive descent through one does not terminate.
 */
export function removeCustom(o: MenuOverride, key: string): MenuOverride {
  const doomed = new Set([key]);
  /* Re-scanned until nothing new is found, so a child listed BEFORE its parent
     in the array is still caught — insertion order is not ancestry order. */
  for (let pass = 0; pass < o.custom.length; pass += 1) {
    let grew = false;
    for (const c of o.custom) {
      if (!doomed.has(c.key) && doomed.has(c.parent)) {
        doomed.add(c.key);
        grew = true;
      }
    }
    if (!grew) break;
  }

  const order: Record<string, string[]> = {};
  for (const [parent, keys] of Object.entries(o.order)) {
    /* A whole level keyed by a deleted parent goes with it — that ordering can
       never apply again, and it is one more thing keeping the override from
       resetting to empty. */
    if (doomed.has(parent)) continue;
    const kept = keys.filter((k) => !doomed.has(k));
    if (kept.length) order[parent] = kept;
  }

  const drop = <T,>(record: Record<string, T>): Record<string, T> => {
    const next: Record<string, T> = {};
    for (const [k, v] of Object.entries(record)) {
      if (!doomed.has(k)) next[k] = v;
    }
    return next;
  };

  return {
    ...o,
    custom: o.custom.filter((c) => !doomed.has(c.key)),
    labels: drop(o.labels),
    descriptions: drop(o.descriptions ?? {}),
    icons: drop(o.icons),
    hidden: o.hidden.filter((k) => !doomed.has(k)),
    order,
  };
}

export function updateCustom(
  o: MenuOverride,
  key: string,
  patch: Partial<CustomMenuItem>
): MenuOverride {
  return {
    ...o,
    custom: o.custom.map((c) => (c.key === key ? { ...c, ...patch, key: c.key } : c)),
  };
}

/**
 * A key for a new admin item.
 *
 * `custom:` namespaced so it can never collide with a shipped key, INCLUDING
 * one a future release introduces — a collision would make the override
 * ambiguous about which item `hidden: ["reports"]` refers to.
 *
 * `crypto.randomUUID` is not available on every browser this app supports, and
 * this runs in an admin form where a thrown ReferenceError would look like the
 * Add button being broken, so it degrades to a counter-and-time key.
 */
let customKeyCounter = 0;
export function newCustomKey(): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${(customKeyCounter += 1)}`;
  return `custom:${uuid}`;
}

/**
 * The shipped tree, flattened for the editor.
 *
 * The editor needs to list what CAN be overridden, which is the shipped tree —
 * not the resolved one, or hidden items would disappear from the editor that is
 * supposed to un-hide them.
 */
export interface FlatMenuEntry {
  key: string;
  parent: string;
  depth: number;
  title: string;
  href?: string;
  description?: string;
  icon?: string;
  /**
   * Did this node ship with a child collection?
   *
   * `parent` alone cannot answer it: a group whose children are all hidden
   * contributes no rows, so nothing downstream would know it was ever a group.
   * The editor needs the distinction to decide what may host an added item.
   */
  hasChildren: boolean;
}

export function flattenMenu(items: MenuNodeLike[]): FlatMenuEntry[] {
  const out: FlatMenuEntry[] = [];
  const walk = (level: MenuNodeLike[], parent: string, depth: number) => {
    for (const item of level) {
      /* Whichever collection is NON-EMPTY, not merely present. `child: []`
         alongside a populated `megaMenu` is a real shape in this codebase, and
         a `||` chain would take the empty array — it is truthy — so the editor
         would show that item as having no children and there would be no way to
         edit the public mega-menu underneath it. */
      const child = Array.isArray(item.child) ? item.child : [];
      const mega = Array.isArray(item.megaMenu) ? item.megaMenu : [];
      const children = child.length ? child : mega;
      out.push({
        key: item.key,
        parent,
        depth,
        title: typeof item.title === "string" ? item.title : item.key,
        href: typeof item.href === "string" ? item.href : undefined,
        description: typeof item.description === "string" ? item.description : undefined,
        icon: typeof item.icon === "string" ? item.icon : undefined,
        hasChildren: children.length > 0,
      });
      if (children.length) walk(children as MenuNodeLike[], item.key, depth + 1);
    }
  };
  walk(items, "", 0);
  return out;
}
