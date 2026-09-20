/**
 * Its own permission rather than reusing `access.settings`.
 *
 * Whoever can retheme the site can also make it unreadable, so this is a real
 * capability and worth granting separately from the settings page — a brand or
 * marketing role wants this and nothing else, and an operations role wants the
 * settings page and not this.
 *
 * Generated into middlewares/permissions.json by tools/build-permission.js.
 */
export const permission = "access.design";
