"use client";

/**
 * Panel collapse state for the bot terminal, persisted.
 *
 * PER-AUDIENCE KEYS, deliberately. The admin's dock defaults open on the log
 * tab and the customer's has no log at all; one shared blob would make a
 * customer inherit an admin's collapse state on a shared browser, and would
 * restore a dock tab that does not exist on their route.
 *
 * HYDRATION happens in a mount effect, never in a `useState` initializer:
 * reading localStorage during render makes the server and client markup differ
 * and React discards the whole subtree. The first paint is therefore always the
 * defaults, and the stored layout arrives one frame later.
 *
 * NOTHING AUTO-COLLAPSES ON A NARROW VIEWPORT. trade/pro force-collapses its
 * orders panel once at tablet width and that write PERSISTS, so a later desktop
 * session still finds it collapsed with no clue why. Responsive behaviour here
 * is a render-time decision only and never touches this blob.
 */

import { useCallback, useEffect, useState } from "react";

/**
 * `ladder` is phone-only — the desktop dock never offers it, because the ladder
 * is the panel the dock sits underneath. It shares this slot so a phone session
 * and a desktop session persist through one field.
 */
export type DockTab =
  | "fills"
  | "quotes"
  | "positions"
  | "health"
  | "log"
  | "ladder"
  /**
   * The customer's remote-control panel. Absent from the admin's tab set — the
   * admin supervises the process directly and has real start/stop on the
   * instance row, so a second control surface driving the same bot through a
   * different path would be two ways to race one process.
   */
  | "control";

export interface TerminalLayout {
  railCollapsed: boolean;
  asideCollapsed: boolean;
  dockCollapsed: boolean;
  dockTab: DockTab;
}

const DEFAULTS: TerminalLayout = {
  railCollapsed: false,
  asideCollapsed: false,
  dockCollapsed: false,
  // `ladder` resolves to `fills` on desktop (the dock sits under the ladder, so
  // it never offers one) and to the ladder itself on a phone, where it is the
  // hero. One default that lands correctly on both.
  dockTab: "ladder",
};

function storageKey(audience: string): string {
  // A runtime-built STORAGE key is fine; a runtime-built Tailwind class name is
  // not — the latter never reaches the compiler and silently renders unstyled.
  return `hb-terminal:layout:${audience}`;
}

export function useTerminalLayout(audience: "admin" | "user", allowedTabs: DockTab[]) {
  /*
   * Layout and its hydrated flag move together in ONE state object, so the flag
   * can never be observed ahead of the layout it guards — the persist effect
   * below keys off it to avoid writing the defaults over a stored blob.
   */
  const [state, setState] = useState<{ layout: TerminalLayout; hydrated: boolean }>({
    layout: DEFAULTS,
    hydrated: false,
  });
  const { layout, hydrated } = state;

  useEffect(() => {
    /*
     * Hydration happens HERE and not in a useState initializer, deliberately.
     * Reading localStorage during render makes the server and client markup
     * differ, and React responds by discarding the whole subtree — which here
     * is the entire terminal. A mount effect is the documented way to adopt
     * browser-only state; one extra render is the price of not breaking
     * hydration, and it happens once per audience.
     */
    let next = DEFAULTS;
    try {
      const raw = window.localStorage.getItem(storageKey(audience));
      if (raw) {
        const parsed = JSON.parse(raw);
        next = {
          // Validate every key: a hand-edited or stale blob must not be able to
          // put a non-boolean into a collapse flag and wedge the layout.
          railCollapsed:
            typeof parsed?.railCollapsed === "boolean"
              ? parsed.railCollapsed
              : DEFAULTS.railCollapsed,
          asideCollapsed:
            typeof parsed?.asideCollapsed === "boolean"
              ? parsed.asideCollapsed
              : DEFAULTS.asideCollapsed,
          dockCollapsed:
            typeof parsed?.dockCollapsed === "boolean"
              ? parsed.dockCollapsed
              : DEFAULTS.dockCollapsed,
          // A stored tab must be validated against what THIS route can render —
          // a persisted "log" on the customer terminal would show an empty dock.
          dockTab: allowedTabs.includes(parsed?.dockTab) ? parsed.dockTab : DEFAULTS.dockTab,
        };
      }
    } catch {
      /* unreadable or disabled storage — the defaults are a fine answer */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ layout: next, hydrated: true });
    // `allowedTabs` is a literal at every call site; re-running on identity
    // changes would clobber a live selection with the stored one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience]);

  useEffect(() => {
    if (!hydrated) return; // never write the defaults over a stored layout
    try {
      window.localStorage.setItem(storageKey(audience), JSON.stringify(layout));
    } catch {
      /* private mode / quota — losing the layout is not worth an error */
    }
  }, [layout, hydrated, audience]);

  const set = useCallback(<K extends keyof TerminalLayout>(key: K, value: TerminalLayout[K]) => {
    setState((prev) =>
      prev.layout[key] === value
        ? prev
        : { ...prev, layout: { ...prev.layout, [key]: value } }
    );
  }, []);

  const toggle = useCallback((key: "railCollapsed" | "asideCollapsed" | "dockCollapsed") => {
    setState((prev) => ({
      ...prev,
      layout: { ...prev.layout, [key]: !prev.layout[key] },
    }));
  }, []);

  return { layout, set, toggle, hydrated };
}
