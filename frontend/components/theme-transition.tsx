"use client";

import { useEffect } from "react";

/**
 * Adds `.theme-transition` to <html> for the duration of a light/dark flip.
 *
 * styles/theme.css scopes its colour transition to that class. Previously the
 * transition was an unconditional `* { transition: ... }`, which animated every
 * colour change on the page — including the first paint, canvas-backed charts,
 * and anything framer-motion was driving.
 *
 * Mounted once in the root layout rather than wired into each toggle: there are
 * 15 `setTheme` call sites, and watching the class next-themes writes covers all
 * of them plus any added later.
 */
const CLASS = "theme-transition";

/* Must outlast the longest transition in styles/theme.css (0.25s). */
const DURATION_MS = 300;

export function ThemeTransition() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wasDark = root.classList.contains("dark");

    const observer = new MutationObserver(() => {
      const isDark = root.classList.contains("dark");
      /* Also fires when we add/remove CLASS ourselves — no flip, so bail. */
      if (isDark === wasDark) return;
      wasDark = isDark;

      root.classList.add(CLASS);
      clearTimeout(timer);
      timer = setTimeout(() => root.classList.remove(CLASS), DURATION_MS);
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      clearTimeout(timer);
      root.classList.remove(CLASS);
    };
  }, []);

  return null;
}
