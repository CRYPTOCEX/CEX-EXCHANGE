/**
 * Reuses `access.design` rather than minting `access.design.specimen`.
 *
 * The permission key contract derives a key from the admin path, so this route
 * would ordinarily get its own. It should not have one: the specimen shows
 * invented rows and no real data, it is the preview surface for the design
 * screen, and anyone who can open /admin/design must be able to see it or that
 * screen's preview is a blank frame. A separate key would be a capability that
 * only ever makes sense granted alongside the one above it.
 *
 * Generated into middlewares/permissions.json by tools/build-permission.js.
 */
export const permission = "access.design";
