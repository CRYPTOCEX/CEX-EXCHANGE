/**
 * Semver-ish ordering for the update consoles.
 *
 * ===========================================================================
 * WHY THIS IS A COMPARISON AND NOT AN EQUALITY TEST
 * ===========================================================================
 * A product's version has THREE independent sources on this platform, and they
 * routinely disagree because they answer different questions:
 *
 *   1. the INSTALLED build   — `package.json` for core, the `extension` row
 *                              for an add-on;
 *   2. the UPDATER           — `/api/admin/system/update/check`, i.e. "what can
 *                              I install right now", behind a ~10-minute cache
 *                              on the licence server;
 *   3. the CATALOGUE         — the published release notes, a separate service
 *                              with its own cache.
 *
 * Measured on `ai_investment`: installed 6.0.1, updater offering 6.0.2,
 * catalogue publishing 6.1.1 / 6.1.0 / 6.0.5 / 6.0.2 / 6.0.0 — the installed
 * build is not in the catalogue AT ALL. Every marker in the old changelog views
 * was written as `v.version === installedVersion`, so the "current" chip they
 * promised simply never drew, and a reader had no way to tell which entries
 * they already had from which were ahead of them.
 *
 * Comparing instead of matching answers that for every row, including the rows
 * that do not exist.
 *
 * ===========================================================================
 * WHY IT IS HERE RATHER THAN IN A PAGE
 * ===========================================================================
 * It was a private function inside `admin/system/extension/[id]/page.tsx`, and
 * `admin/system/update` needs exactly the same rule against exactly the same
 * three sources. A second copy is how the two consoles start disagreeing about
 * which release is newer — the same drift that produced three copies of the
 * product-id map (see `store/patch-notes.ts`).
 *
 * Numeric per segment, split on `.`, `-` and `+`, so `6.1.0-rc.1` orders under
 * `6.1.0` rather than throwing the list into string order — where "6.10.0"
 * sorts before "6.9.0".
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    String(v || "")
      .split(/[.\-+]/)
      .map((n) => (Number.isFinite(parseInt(n, 10)) ? parseInt(n, 10) : 0));
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}
