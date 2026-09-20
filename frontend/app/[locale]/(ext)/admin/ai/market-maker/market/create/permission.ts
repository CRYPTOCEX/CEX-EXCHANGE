// Co-located permission contract for this admin page. This file is NOT imported
// by the page — it is a build input for `tools/build-permission.js` (which
// writes `frontend/middlewares/permissions.json`) and for
// `tools/extract-permission.js` (which rebuilds the backend permissions seeder
// from these files on every `pnpm bundle`).
//
// KEY UNCHANGED; the manifest moved onto it. The manifest demanded
// `create.ai.market.maker`, retired and DELETEd by
// `20260801000001-permission-key-rename.js:112`, which carries its grants onto
// exactly this key — so the move is access-neutral for everyone who could reach
// this screen before the rename, and it restores a gate that is currently
// unsatisfiable by anyone but Super Admin.
export const permission = "create.ai.market_maker.market";
