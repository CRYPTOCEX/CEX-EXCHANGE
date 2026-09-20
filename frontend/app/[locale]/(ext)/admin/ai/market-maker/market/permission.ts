// Co-located permission contract for this admin page. This file is NOT imported
// by the page — it is a build input for `tools/build-permission.js` (which
// writes `frontend/middlewares/permissions.json`) and for
// `tools/extract-permission.js` (which rebuilds the backend permissions seeder
// from these files on every `pnpm bundle`).
//
// KEY UNCHANGED; the manifest moved onto it. THIS IS THE ONE ENTRY IN THE
// MARKET-MAKER FAMILY WITHOUT A CLEAN GRANT CARRY-OVER, so it is worth being
// precise about who gains and who loses:
//
//   - The manifest demanded `access.ai.market.maker`, retired and DELETEd by
//     `20260801000001-permission-key-rename.js:108`. That seeder maps it onto
//     `access.ai.market_maker` — the addon root — and NOT onto
//     `access.ai.market_maker.market`, which is what this screen wants. So a
//     role that held the old dotted key does not automatically arrive here.
//   - Nobody LOSES access, because the old key no longer exists on any migrated
//     install: this screen is already Super-Admin-only today. The change moves
//     it from "gated on a key nobody can hold" to "gated on a key that can
//     actually be granted".
//   - Some roles GAIN it: line 127 of the same seeder maps the retired
//     `access.ai.trading.market` family onto `access.ai.market_maker.market`,
//     and those holders will now be able to open this screen. That is the
//     spelling the backend routes check, so it is the intended destination —
//     but it IS a widening relative to today, and it is called out here rather
//     than buried in a regenerated JSON blob.
export const permission = "access.ai.market_maker.market";
