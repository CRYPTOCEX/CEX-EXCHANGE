// Co-located permission contract for this admin page. This file is NOT imported
// by the page — it is a build input for `tools/build-permission.js` (which
// writes `frontend/middlewares/permissions.json`) and for
// `tools/extract-permission.js` (which rebuilds the backend permissions seeder
// from these files on every `pnpm bundle`).
//
// KEY UNCHANGED; the manifest moved onto it. The manifest still demanded
// `access.ai.market.maker.analytics`, which
// `20260801000001-permission-key-rename.js:109` retires — row and grants
// DELETEd — so the gate has been unsatisfiable and this screen Super-Admin-only
// on every migrated install. The same seeder carries the old key's grants onto
// `access.ai.market_maker.analytics` first, so nobody loses access in the move.
export const permission = "access.ai.market_maker.analytics";
