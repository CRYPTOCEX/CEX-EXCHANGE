"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * The theme switch for a CHROMELESS route.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE SCREENS NEED THEIR OWN
 * ---------------------------------------------------------------------------
 * `EditorShell` routes suppress the site header (their segment layout's
 * `CHROMELESS` list), and the site header is where the theme control lives. So
 * on the support ticket page and the operator inbox — the two screens a person
 * sits in for an hour at a time — there was no way to leave dark mode without
 * navigating out of the route entirely.
 *
 * The header's own `ThemeToggle` is not reusable here: it is private to
 * `site-header.tsx`, it is a 40px `rounded-xl` control with two framer-motion
 * layers, and the editor bar is 48px of `size-7`/`size-8` ghost buttons. A
 * control that big in that bar reads as a different design.
 *
 * ---------------------------------------------------------------------------
 * THE GLYPH IS GATED ON HYDRATION, AND THE BOX IS NOT
 * ---------------------------------------------------------------------------
 * `resolvedTheme` is undefined on the server and for the first client frame, so
 * choosing the glyph from it directly renders the wrong icon and trips a
 * hydration mismatch. `useSyncExternalStore` gives `false` on the server and
 * `true` after hydration without a `setState` in an effect.
 *
 * The BUTTON always renders at its full size — only the glyph waits. Gating the
 * whole control would pop a 32px button into the bar a frame late and shove
 * every action beside it sideways, which is the layout shift this bar has been
 * repeatedly repaired to avoid.
 */

const subscribeNever = () => () => {};

function useIsHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}

export function EditorThemeToggle({ className }: { className?: string }) {
  const tCommon = useTranslations("common");
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useIsHydrated();

  /*
   * A JS-level `isDark ? a : b` is normally worse than a `dark:` variant — but
   * this one picks a GLYPH, not a colour. Sun-vs-moon is content: it names the
   * theme you are about to switch to, and no CSS variant can express that.
   */
  const isDark = hydrated ? resolvedTheme === "dark" : false;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className ?? "size-8"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={tCommon("toggle_theme")}
      title={hydrated ? (isDark ? tCommon("light_mode") : tCommon("dark_mode")) : undefined}
    >
      {hydrated ? (
        isDark ? (
          <Sun className="size-4" aria-hidden />
        ) : (
          <Moon className="size-4" aria-hidden />
        )
      ) : (
        // Reserves the glyph's box for one frame so nothing beside it moves.
        <span className="size-4" aria-hidden />
      )}
    </Button>
  );
}
