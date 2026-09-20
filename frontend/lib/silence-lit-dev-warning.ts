/**
 * Suppresses Lit's one-off "Lit is in dev mode. Not recommended for
 * production!" console line.
 *
 * Lit arrives here through @reown/appkit, whose web components are built on it.
 * In development Lit's dev build announces itself on every page load; the
 * production bundle resolves to Lit's non-dev entry, so the message can never
 * reach a user and there is nothing to act on.
 *
 * Lit dedupes through `globalThis.litIssuedWarnings`, checking both the full
 * message and the short code, so seeding the code silences this one warning and
 * leaves every other Lit warning (missing polyfill support, multiple versions,
 * change-in-update, …) working.
 *
 * Import this module *before* anything that pulls in Lit: ES modules evaluate
 * in import order, so a first-position import runs its side effect ahead of the
 * appkit module body. A matching inline script in the root layout covers entry
 * points that never touch this file.
 */
const globalWithLit = globalThis as typeof globalThis & {
  litIssuedWarnings?: Set<string>;
};

if (!globalWithLit.litIssuedWarnings) {
  globalWithLit.litIssuedWarnings = new Set<string>();
}
globalWithLit.litIssuedWarnings.add("dev-mode");

export {};
