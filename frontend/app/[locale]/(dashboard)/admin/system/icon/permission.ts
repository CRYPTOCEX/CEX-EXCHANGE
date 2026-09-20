/**
 * SINGULAR `permission` with a string literal — this exact shape is what
 * tools/build-permission.js parses to regenerate middlewares/permissions.json:
 *
 *   /export\s+const\s+permission\s*=\s*(['"`])(.+?)\1\s*;/m
 *
 * The plural array form some sibling pages use (system/logo, for one) does NOT
 * match, so those pages are absent from the manifest and fall back to requiring
 * `access.admin` in middlewares/auth.ts. Written this way so a regeneration
 * keeps the /admin/system/icon entry instead of silently dropping it.
 */
export const permission = "view.currency.icon";
