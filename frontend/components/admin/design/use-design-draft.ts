"use client";

/**
 * The design manager's state.
 *
 * One hook owns the draft, what "saved" means, how a token resolves, and how a
 * change reaches a live document. Keeping all four together is deliberate:
 * every one of them has to agree about the difference between "the owner set
 * this" and "this is the shipped default", and splitting them is how that
 * distinction gets lost.
 *
 * WHY THE DRAFT STORES ONLY OVERRIDES
 * -----------------------------------
 * A saved theme records the tokens the owner actually changed, never all 45.
 * If it stored a full snapshot, a later improvement to a shipped default would
 * never reach any site whose owner had once opened this page — the Phase 13
 * light-mode contrast pass moved eleven tokens, and a snapshot taken before it
 * would have pinned the old, failing values forever.
 *
 * So `resolveToken` is the only correct way to read a value: override first,
 * shipped default second.
 */

import * as React from "react";
import { useConfigStore } from "@/store/config";
import { $fetch } from "@/lib/api";
import {
  buildThemeCss,
  DESIGN_THEME_SETTING_KEY,
  DESIGN_THEME_STYLE_HREF,
  EMPTY_THEME,
  FONT_SLOTS,
  FONT_STACKS,
  TOKEN_BY_NAME,
  isValidTokenValue,
  normalizeTheme,
  parseStoredTheme,
  splitBase,
  themeToResolvedVars,
  type DesignTheme,
} from "@/lib/design-theme";
import { writeManagedStyle } from "@/lib/live-style";
import { DEFAULT_BASE, DEFAULT_THEMED } from "@/lib/design-theme-defaults";
import { presetToTheme, type Preset } from "@/lib/design-palette";

export type Scheme = "light" | "dark";

/** Deep-ish equality that ignores key order, which JSON.stringify does not. */
function sameTheme(a: DesignTheme, b: DesignTheme): boolean {
  const bag = (o: Record<string, string>) =>
    Object.keys(o)
      .sort()
      .map((k) => `${k}=${o[k]}`)
      .join("|");
  return (
    bag(a.light) === bag(b.light) &&
    bag(a.dark) === bag(b.dark) &&
    bag(a.base) === bag(b.base) &&
    bag(a.fonts) === bag(b.fonts)
  );
}

export function useDesignDraft() {
  const settings = useConfigStore((s) => s.settings);
  const updateSetting = useConfigStore((s) => s.updateSetting);

  const serverSaved = React.useMemo(
    () => parseStoredTheme(settings?.[DESIGN_THEME_SETTING_KEY]),
    [settings]
  );

  /**
   * What this session last wrote, and what it wrote OVER.
   *
   * Saving now triggers a `router.refresh()` so the server-rendered half of the
   * page follows, and that re-seeds the whole settings store from a fresh SSR
   * read — which can legitimately still be serving the PREVIOUS value. The
   * backend's cache is invalidated immediately in-process and by pub/sub, but
   * the durable fallback path (`CacheManager`'s version stamp) is polled on a
   * 5s interval, so a refresh fired milliseconds after a save can land on a
   * worker that has not caught up yet.
   *
   * Without this, that read would arrive as "the server says the theme is the
   * old one", the panel would adopt it, and a save the owner just watched
   * succeed would silently reappear as an unsaved change.
   */
  const [lastWrite, setLastWrite] = React.useState<{
    wrote: DesignTheme;
    over: DesignTheme;
  } | null>(null);

  /**
   * The server value, with a stale echo of our own write corrected away.
   *
   * A settings read that still shows exactly the theme we just replaced is our
   * own write not having landed yet — not somebody else's decision. Any OTHER
   * value is treated as real and adopted normally, so a second admin saving
   * from another browser still reaches this panel.
   *
   * The one thing this cannot distinguish is a second admin deliberately
   * reverting to precisely the value we replaced, while this page is open. That
   * is ignored until reload, which is the same trade the "never clobber unsaved
   * edits" rule below already makes.
   */
  const saved = React.useMemo(
    () => (lastWrite && sameTheme(serverSaved, lastWrite.over) ? lastWrite.wrote : serverSaved),
    [serverSaved, lastWrite]
  );

  const [draft, setDraft] = React.useState<DesignTheme>(saved);
  const [saving, setSaving] = React.useState(false);

  /**
   * Keep the draft in step with server state, but never clobber unsaved edits.
   *
   * This replaces a one-shot `hydrated` ref that adopted `saved` the FIRST time
   * the settings store was non-empty and then never looked again. That is a
   * latent staleness bug with a real trigger: the config store is persisted to
   * localStorage and rehydrates before the fresh values arrive, so if the
   * persisted snapshot lacks `designTheme` — or carries an older one — the panel
   * pinned that snapshot for the rest of the session. Reloading the page then
   * showed a theme the site was not actually using, with no preset selected,
   * which is exactly the "it doesn't tell me which one is active" report.
   *
   * The rule is: adopt the new server value whenever the draft still equals the
   * PREVIOUS server value (i.e. the owner has not touched anything). If they
   * have edits in flight, leave them alone — losing typed work to a background
   * settings refresh would be far worse than showing a slightly stale baseline,
   * and the Unsaved badge already tells them where they stand.
   */
  const adopted = React.useRef<DesignTheme | null>(null);
  React.useEffect(() => {
    if (!settings || Object.keys(settings).length === 0) return;
    const prev = adopted.current;
    if (prev && !sameTheme(draft, prev)) {
      // Unsaved edits in flight — remember the new baseline, keep the draft.
      adopted.current = saved;
      return;
    }
    if (prev && sameTheme(prev, saved)) return; // nothing actually changed
    adopted.current = saved;
    setDraft(saved);
  }, [settings, saved, draft]);

  const dirty = React.useMemo(() => !sameTheme(draft, saved), [draft, saved]);

  /** Effective value of a token: override if present, else the shipped default. */
  const resolveToken = React.useCallback(
    (name: string, scheme: Scheme): string => {
      const def = TOKEN_BY_NAME[name];
      if (def && !def.themed) return draft.base[name] ?? DEFAULT_BASE[name] ?? "";
      return draft[scheme][name] ?? DEFAULT_THEMED[name]?.[scheme] ?? "";
    },
    [draft]
  );

  /** True when the owner has moved this token away from the shipped value. */
  const isOverridden = React.useCallback(
    (name: string, scheme: Scheme): boolean => {
      const def = TOKEN_BY_NAME[name];
      if (def && !def.themed) return name in draft.base;
      return name in draft[scheme];
    },
    [draft]
  );

  const setToken = React.useCallback(
    (name: string, scheme: Scheme, value: string) => {
      const def = TOKEN_BY_NAME[name];
      if (!def) return;
      if (!isValidTokenValue(def.kind, value)) return;
      setDraft((prev) => {
        const bucket = def.themed ? scheme : "base";
        return { ...prev, [bucket]: { ...prev[bucket], [name]: value } };
      });
    },
    []
  );

  /** Drop an override so the token falls back to the shipped default. */
  const clearToken = React.useCallback((name: string, scheme: Scheme) => {
    const def = TOKEN_BY_NAME[name];
    if (!def) return;
    setDraft((prev) => {
      const bucket = def.themed ? scheme : "base";
      const next = { ...prev[bucket] };
      delete next[name];
      return { ...prev, [bucket]: next };
    });
  }, []);

  const setFont = React.useCallback((slot: string, id: string) => {
    const stack = FONT_STACKS[id];
    const def = FONT_SLOTS.find((s) => s.key === slot);
    if (!stack || !def || !def.categories.includes(stack.category as never)) return;
    setDraft((prev) => ({ ...prev, fonts: { ...prev.fonts, [slot]: id } }));
  }, []);

  /** Replace the whole draft — presets, generated palettes, imports. */
  const replaceDraft = React.useCallback((next: DesignTheme) => {
    setDraft(normalizeTheme(next));
  }, []);

  /**
   * A PRESET IS A PALETTE, NOT A WHOLE INTERFACE.
   *
   * This replaced the draft outright, which was right when `base` held only
   * `--radius` and `--motion-scale`. It now also holds the 27 component
   * geometry tokens (plans/COMPONENT-SYSTEM.md), so a replace meant pressing
   * "Ember" to try a warmer palette silently threw away the owner's table
   * density, control corners and card padding — with no warning and nothing to
   * undo it but Discard, which would also lose the palette they had just
   * chosen.
   *
   * Colour and proportion are separate decisions and the panel presents them as
   * separate decisions, so choosing one must not reset the other. The component
   * half is carried across; each component panel has its own reset.
   */
  const applyPreset = React.useCallback(
    (preset: Preset) =>
      setDraft((prev) => {
        const next = normalizeTheme(presetToTheme(preset));
        const carried = splitBase(prev.base).component;
        return { ...next, base: { ...next.base, ...carried } };
      }),
    []
  );

  /**
   * Back to the shipped palette — no COLOUR, type, radius or motion overrides.
   *
   * Component geometry survives, for the same reason it survives a preset: the
   * menu item says "colours", each component panel carries its own "Reset all",
   * and a control that resets more than it names is one an owner learns not to
   * press.
   */
  const resetToShipped = React.useCallback(
    () =>
      setDraft((prev) => ({
        ...EMPTY_THEME,
        base: splitBase(prev.base).component,
      })),
    []
  );

  const discard = React.useCallback(() => setDraft(saved), [saved]);

  const save = React.useCallback(async () => {
    setSaving(true);
    try {
      const next = normalizeTheme(draft);
      const payload = JSON.stringify(next);
      const { error } = await $fetch({
        url: "/api/admin/system/settings",
        method: "PUT",
        // Changed-keys-only is the platform contract: the backend treats every
        // submitted key as a write, and protected keys are Super-Admin gated.
        // One key is all this page ever owns.
        body: { [DESIGN_THEME_SETTING_KEY]: payload },
        // Site-wide on the very next request: `lib/fetchers/settings.ts` is
        // `no-store`, so there is no revalidate window to wait out. THIS tab is
        // repainted below; only tabs already open elsewhere need a reload.
        successMessage: "Design saved and applied — other open tabs pick it up on reload",
        errorMessage: "Could not save the design",
      });
      if (!error) {
        updateSetting(DESIGN_THEME_SETTING_KEY, payload);
        /* Remember what we replaced, so the refresh that follows cannot hand
           the old value back as if it were news. See `lastWrite` above. */
        setLastWrite({ wrote: next, over: saved });
        /* Repaint the document the owner is actually looking at.
           ------------------------------------------------------------------
           This is the whole difference between "Save wrote a row" and "Save
           changed the site". The theme is server-rendered into an href-keyed
           hoistable <style>, and React reuses that tag without diffing its
           contents — so re-rendering the layout, refreshing the router, or
           navigating client-side all leave the OLD palette painting until a
           full document load. Saving therefore looked like it had done nothing.

           `next`, not `draft`: exactly the value that was persisted, run
           through exactly the builder the server uses, so this tab and the next
           reload cannot disagree.

           Note this repaints the ADMIN SHELL too, deliberately. The editor's
           optional "preview on this page" toggle is about an UNSAVED draft;
           once a theme is saved it is simply the site's theme, and this page is
           part of the site. */
        writeManagedStyle(DESIGN_THEME_STYLE_HREF, buildThemeCss(next));
      }
      return !error;
    } finally {
      setSaving(false);
    }
  }, [draft, saved, updateSetting]);

  return {
    draft,
    saved,
    dirty,
    saving,
    resolveToken,
    isOverridden,
    setToken,
    clearToken,
    setFont,
    replaceDraft,
    applyPreset,
    resetToShipped,
    discard,
    save,
  };
}

/**
 * Push a theme into a document as inline custom properties.
 *
 * Inline rather than a swapped `<style>` element because an inline declaration
 * on the root beats every cascade layer, including the `admin-theme` layer the
 * saved theme is emitted into — so the preview is exact even while a saved
 * theme is already active.
 *
 * FULLY RESOLVED, NOT THE DIFF
 * ----------------------------
 * `themeToResolvedVars` writes a shipped default for every token the draft does
 * not override. That is the difference between "the site plus these edits" and
 * "the site as it would be if this were saved", and only the second one is a
 * preview — the iframe has already rendered the SAVED theme, so anything the
 * diff omits fell through to it. Obsidian is the extreme case: it is correctly
 * an empty theme, so the diff wrote nothing and the preset that says "the
 * shipped look" showed whatever the owner had saved last. See
 * `themeToResolvedVars` for the full argument.
 *
 * `clearVarsFrom` is the opposite operation and has to stay separate: an empty
 * theme no longer means "paint nothing".
 *
 * Only colours, radii, fonts and motion move, and none of those participate in
 * layout except the typeface, so applying a theme reflows nothing that was not
 * going to reflow anyway.
 */
export function applyVarsTo(
  doc: Document | null | undefined,
  theme: DesignTheme,
  scheme: Scheme
) {
  if (!doc?.documentElement) return;
  const root = doc.documentElement;
  const vars = themeToResolvedVars(theme, scheme);

  /* Remove properties that are no longer part of the draft, otherwise a token
     the owner just reset would keep its inline value and appear stuck. */
  const stale: string[] = [];
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style.item(i);
    if (prop.startsWith("--") && !(prop in vars)) stale.push(prop);
  }
  for (const prop of stale) root.style.removeProperty(prop);

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}

/** Drop every inline custom property, handing the document back to its own CSS. */
export function clearVarsFrom(doc: Document | null | undefined) {
  if (!doc?.documentElement) return;
  const root = doc.documentElement;
  const props: string[] = [];
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style.item(i);
    if (prop.startsWith("--")) props.push(prop);
  }
  for (const prop of props) root.style.removeProperty(prop);
}

/** Force a preview document into a colour scheme without touching its storage. */
export function applySchemeTo(doc: Document | null | undefined, scheme: Scheme) {
  if (!doc?.documentElement) return;
  doc.documentElement.classList.toggle("dark", scheme === "dark");
  doc.documentElement.style.colorScheme = scheme;
}
