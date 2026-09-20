/**
 * EMPTY — and it should stay that way.
 *
 * This file used to suppress `no-restricted-syntax` for 164 files that still
 * contained hardcoded palette colours or `dark:` colour forks. Every one of them
 * has now been migrated or deleted, so there is nothing left to suppress and the
 * design-system rule is live across the whole tree.
 *
 * The file is kept rather than deleted outright for two reasons:
 *   - `scripts/scan-design-debt.js` aborts if it is missing, and it is still the
 *     thing that reports "stale baseline entries".
 *   - An empty list is a clearer signal than an absent file: it says the ratchet
 *     reached zero, not that someone removed the ratchet.
 *
 * DO NOT add entries. A file that fails the rule is a file to fix, not one to
 * exempt — `components/(ext)/chart-engine/` spent this entire migration excluded
 * from both gates and quietly accumulated ~800 palette classes, including the
 * `COLORS.DARK` / `COLORS.LIGHT` hex pair that was actually painting the chart.
 * An exclusion is how debt becomes invisible, not how it gets fixed.
 *
 * NEVER run `node scripts/scan-design-debt.js --baseline` to "tidy" this list.
 * The scanner is narrower than the ESLint rule — see its own header, line 41 —
 * so regenerating drops entries the rule still needs and leaves CI red.
 */
module.exports = [];
