/**
 * Same capability as the design manager and /admin/appearance, deliberately.
 *
 * `access.design` already means "may change how the whole public site looks",
 * and deciding which entries the navigation offers is exactly that job — an
 * owner who can repaint every surface is not a different person from the one who
 * decides whether the header advertises Staking.
 *
 * A fresh string (`access.menus`) would have been the tidier-looking choice and
 * the wrong one: permissions are rows seeded by
 * `backend/seeders/20240402234643-permissions.js`, so an id that exists only in
 * this file is held by NOBODY. Every non-super-admin role would be locked out of
 * a page the menu still advertises, until someone noticed the missing seeder.
 * `access.design` is already seeded, already in `permissions.json`, and already
 * in the union on the "Appearance & Design" menu group in config/menu.ts, so all
 * three gates agree the moment this ships.
 *
 * Read by tools/build-permission.js, which regenerates
 * middlewares/permissions.json. That manifest fails CLOSED — an admin path that
 * is not listed falls back to requiring `access.admin` — so the generator has to
 * run before a role holding only `access.design` can open this page.
 */
export const permission = "access.design";
