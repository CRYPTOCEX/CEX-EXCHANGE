// Co-located permission contract for this admin page. This file is NOT imported
// by the page — it is a build input for `tools/build-permission.js` (which
// writes `frontend/middlewares/permissions.json`, the file `middlewares/auth.ts`
// gates on) and for `tools/extract-permission.js` (which rebuilds the backend
// permissions seeder from these files on every `pnpm bundle`).
//
// THE KEY BELOW IS UNCHANGED. What changed is the manifest, which until now
// still demanded the pre-rename spelling `access.ai.market.maker` — the addon
// name split across a dot. That entry was not merely stale, it was BROKEN:
// `20260801000001-permission-key-rename.js:108` retires the dotted key, and its
// step 3 DELETEs the permission row and every grant pointing at it. On any
// install that has run that seeder the key cannot be held by anyone, so this
// screen has been Super-Admin-only — and silently, because Super Admin bypasses
// the gate outright at `middlewares/auth.ts:241`, so an owner testing their own
// admin sees nothing wrong.
//
// Aligning the manifest to this file costs no one their access: the same seeder
// carries every grant from `access.ai.market.maker` onto `access.ai.market_maker`
// (step 2 runs BEFORE the delete in step 3), so every role that could open this
// screen before the rename can open it again afterwards. The backend agrees
// too — every market-maker route checks the underscore spelling, and
// `config/menu.ts` already hangs the menu off the new keys.
//
// The manifest could NOT simply be frozen at the dotted key to "preserve
// behaviour": `extract-permission.js` harvests these files back into
// `backend/seeders/20240402234643-permissions.js`, so writing a retired key
// here would resurrect it as a grantable row on the next `pnpm bundle` and undo
// the migration.
export const permission = "access.ai.market_maker";
