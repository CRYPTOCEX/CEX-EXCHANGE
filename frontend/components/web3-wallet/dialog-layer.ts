/**
 * The stacking tier the wallet's own dialogs sit on.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * THE PROBLEM: AppKit's `<w3m-modal>` ships `z-index: 2147483647` — the maximum
 * 32-bit signed integer. On the connect path the user picks this wallet in
 * AppKit's chooser, AppKit switches to its "Continue in <wallet>" waiting screen
 * (written for an external wallet it cannot see into), and the request it is
 * waiting for is our own approval dialog — rendered underneath it, unreachable,
 * until the request times out.
 *
 * ── THE FIRST FIX WAS TO MATCH 2147483647, AND IT WAS THE WRONG FIX ─────────
 * It worked (a z-index tie is broken by DOM order, and a Radix portal always
 * mounts after the module-scope `<w3m-modal>`) and it was a ratchet violation:
 * `scan-design-debt.js`, dimension `z-scale`, limit 0. The ladder in
 * globals.css is explicit that `--z-top: 9999` is the last resort and *nothing
 * may be added above it*, so there was no legitimate value to climb to.
 *
 * ── SO APPKIT COMES DOWN INTO THE LADDER INSTEAD ────────────────────────────
 * `--w3m-z-index` is AppKit's own supported override, set once in globals.css
 * to `--z-overlay` (110). AppKit then sits where a full-screen overlay belongs,
 * still comfortably above the site header and any ordinary Radix dialog at
 * z-50 — so wallet login, which opens AppKit from a dialog, is unaffected — and
 * the wallet's consent sheets sit at `--z-modal` (200), which is the tier
 * defined for "a modal that must clear the overlay layer". That is exactly what
 * this is.
 *
 * Better than the hack in three ways: it obeys the ladder, it does not depend on
 * DOM insertion order, and the relationship is now legible to the next person
 * from the token names alone.
 *
 * ── THE OVERLAY DELIBERATELY STAYS ON THE NORMAL TIER ───────────────────────
 * Only the panel is raised, so AppKit's own backdrop still shows behind it,
 * which reads correctly: AppKit IS still open and waiting.
 * ═════════════════════════════════════════════════════════════════════════════
 */
export const WALLET_DIALOG_LAYER = "z-[var(--z-modal)]";
