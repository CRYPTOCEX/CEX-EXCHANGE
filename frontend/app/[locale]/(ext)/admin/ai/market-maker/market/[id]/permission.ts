// Co-located permission contract for this admin page. This file is NOT imported
// by the page — it is a build input for `tools/build-permission.js` (which
// writes `frontend/middlewares/permissions.json`) and for
// `tools/extract-permission.js` (which rebuilds the backend permissions seeder
// from these files on every `pnpm bundle`).
//
// KEY UNCHANGED; the manifest moved onto it. The manifest demanded
// `view.ai.market.maker`, retired and DELETEd by
// `20260801000001-permission-key-rename.js:111`, which carries its grants onto
// exactly this key — so every role that could open this market detail screen
// before the rename can open it after, and no one else gains.
//
// The `edit.` verb on what looks like a detail view is deliberate and matches
// the seeder's own mapping (`view.ai.market.maker` -> `edit.ai.market_maker.market`):
// this screen is the market editor, not a read-only view.
export const permission = "edit.ai.market_maker.market";
