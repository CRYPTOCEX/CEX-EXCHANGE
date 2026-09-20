/**
 * Rewrite one of the root layout's href-keyed <style> tags in the LIVE document.
 * ============================================================================
 *
 * WHY THIS HAS TO EXIST — i.e. why the server cannot do it
 * --------------------------------------------------------
 * The saved theme and the navbar's height are emitted by the root layout as
 * React 19 HOISTABLE RESOURCES: `<style href="…" precedence="high">`. Being
 * hoistable is what makes them safe — React keys them by `href` instead of
 * reconciling them positionally, so the tag can be moved around <head> by Next's
 * own CSS emission, and a cached HTML shell may legitimately disagree with a
 * freshly-rendered RSC payload, without ever throwing a hydration mismatch.
 *
 * The price is exactly the bug this fixes: **React reuses the existing tag and
 * never diffs its contents**. So re-rendering the layout — via `router.refresh`,
 * via a client navigation, via anything short of a new document — cannot change
 * the CSS inside it. Saving a design wrote the new theme to the database, every
 * *other* page load picked it up (the settings fetch is `no-store`), and the tab
 * the owner was actually looking at kept painting the old palette until they hit
 * reload. Which reads, correctly, as "Save didn't do anything".
 *
 * So the client writes the tag directly. This is not a second source of truth:
 * the CSS written here is produced by the SAME builder the layout uses, from the
 * value that was just persisted, so a reload lands on identical bytes.
 *
 * WHY IT IS SAFE TO CREATE THE TAG WHEN IT IS MISSING
 * --------------------------------------------------
 * A site with no saved theme renders no theme tag at all, so the first save of a
 * brand-new install has nothing to rewrite. The created element carries the same
 * `data-href` / `data-precedence` attributes React emits, and it is appended at
 * the END of <head>: every rule these tags carry is UNLAYERED (see
 * `buildThemeCss`), so it already outranks every layer in globals.css, and being
 * last also settles source order against any other unlayered `:root` rule.
 *
 * React discovers existing hoistables when the root hydrates, so a tag created
 * afterwards is unknown to it and a later refresh may insert a second one. That
 * is harmless by construction — both carry the same CSS, and ours is later in
 * the document — but it is the reason this only ever runs on an explicit save
 * rather than on every render.
 */

/**
 * The attribute React actually emits. `id`/`href` are stripped from a hoistable
 * style; `data-href` is what ends up in the DOM, and it is what to look for when
 * debugging one of these tags.
 */
function styleSelector(href: string): string {
  return `style[data-href="${href}"]`;
}

/**
 * Replace the CSS inside the managed `<style>` for `href`.
 *
 * An empty `css` blanks the tag rather than removing it: the tag is a React
 * resource, and unmounting it behind React's back is a class of bug that shows
 * up much later and somewhere else. A blank stylesheet is inert, which is all
 * "this site has no overrides" needs to mean.
 */
export function writeManagedStyle(href: string, css: string): void {
  if (typeof document === "undefined") return;

  let el = document.querySelector<HTMLStyleElement>(styleSelector(href));

  if (!el) {
    /* Nothing to say and nothing to say it in — don't litter <head> with an
       empty tag on every save of an un-themed site. */
    if (!css) return;
    el = document.createElement("style");
    el.setAttribute("data-href", href);
    el.setAttribute("data-precedence", "high");
    document.head.appendChild(el);
  }

  /* Guarded so an unchanged save does not replace the node's text and force the
     engine to re-parse and re-resolve style for the whole document. */
  if (el.textContent !== css) {
    el.textContent = css;
    notifyDesignTokensChanged();
  }
}

/* ==========================================================================
   TELLING THE NON-CSS WORLD THAT THE TOKENS MOVED
   ========================================================================== */

/**
 * Most of the app repaints for free when this tag is rewritten, because it reads
 * its colour through `hsl(var(--token))` and the engine re-resolves style for
 * us. The exceptions are the consumers that took a token as a JS *string* — a
 * canvas, the TradingView widget's `applyOverrides` — because that string is a
 * SNAPSHOT taken when they last read it. Rewriting the stylesheet cannot reach
 * them, so saving a palette left every chart on the previous colours until the
 * page was reloaded.
 *
 * A `MutationObserver` would be the obvious way for those consumers to notice,
 * but the thing that changed here is the TEXT of a <style> in <head>, and
 * observing that means observing every stylesheet Next injects during dev. An
 * explicit event from the one function that performs the write is both cheaper
 * and exact.
 */
export const DESIGN_TOKENS_CHANGED_EVENT = "design-tokens-changed";

function notifyDesignTokensChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DESIGN_TOKENS_CHANGED_EVENT));
}

/**
 * Subscribe to "the resolved value of a design token may have changed".
 *
 * Covers BOTH ways that happens: an owner saving in the design manager (the
 * event above) and a colour-scheme flip, which next-themes performs by swapping
 * the `class` / `style` / `data-theme` attributes on <html> and which therefore
 * never goes through `writeManagedStyle`.
 *
 * Fires on the trailing edge of a microtask-free rAF so a burst of edits — the
 * design manager writes on every keystroke — collapses into one repaint.
 *
 * @returns an unsubscribe function.
 */
export function onDesignTokensChanged(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  let scheduled = 0;
  const schedule = () => {
    if (scheduled) return;
    scheduled = requestAnimationFrame(() => {
      scheduled = 0;
      callback();
    });
  };

  window.addEventListener(DESIGN_TOKENS_CHANGED_EVENT, schedule);

  const observer =
    typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(schedule);
  observer?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });

  return () => {
    window.removeEventListener(DESIGN_TOKENS_CHANGED_EVENT, schedule);
    observer?.disconnect();
    if (scheduled) cancelAnimationFrame(scheduled);
  };
}
