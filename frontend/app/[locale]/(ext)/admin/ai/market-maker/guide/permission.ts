// Co-located permission contract for this admin page. This file is NOT imported
// by the page — it is a build input for `tools/build-permission.js` (which
// writes `frontend/middlewares/permissions.json`) and for
// `tools/extract-permission.js` (which rebuilds the backend permissions seeder
// from these files on every `pnpm bundle`).
//
// KEY UNCHANGED; the manifest moved onto it. The manifest still demanded the
// retired dotted spelling `access.ai.market.maker`
// (`20260801000001-permission-key-rename.js:108` deletes the row and its
// grants), so this guide page has been Super-Admin-only on every migrated
// install. Grants are carried onto `access.ai.market_maker` by the same seeder
// before the delete, so the alignment restores access rather than granting new
// access.
export const permission = "access.ai.market_maker";
