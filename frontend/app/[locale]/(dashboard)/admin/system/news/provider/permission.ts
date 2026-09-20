/**
 * Deliberately the SAME key as the Market News table this screen sits beside,
 * rather than a new `access.market.news.provider`.
 *
 * A new key is holdable by no role until a seeder ships it and grants it, which
 * would turn a working screen Super-Admin-only on every install that upgrades
 * into this release. Choosing where the feed comes from is the same
 * responsibility as editing what is in it, so it takes the same key.
 *
 * This file is a BUILD INPUT, not documentation: `tools/build-permission.js`
 * walks the app tree and generates `frontend/middlewares/permissions.json`,
 * which the auth middleware matches request paths against. A screen with no
 * `permission.ts` produces no manifest entry and falls through to the broad
 * `access.admin` fallback.
 */
export const permission = "access.market.news";
