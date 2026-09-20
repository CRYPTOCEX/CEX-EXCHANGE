// Co-located permission contract for this admin page. This file is NOT imported
// by the page — it is a build input for `tools/build-permission.js` (which
// writes `frontend/middlewares/permissions.json`) and for
// `tools/extract-permission.js` (which rebuilds the backend permissions seeder
// from these files on every `pnpm bundle`).
//
// KEY UNCHANGED; the manifest moved onto it. The manifest demanded
// `access.ai.market.maker.settings`, retired and DELETEd by
// `20260801000001-permission-key-rename.js:110`, which carries its grants onto
// exactly this key — so the move is access-neutral for prior holders and
// repairs a gate that no role can currently satisfy.
export const permission = "access.ai.market_maker.settings";
