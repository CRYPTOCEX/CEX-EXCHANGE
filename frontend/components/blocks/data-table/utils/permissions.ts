// utils/permissions.ts

/**
 * `permission` accepts `undefined` because every field on `TablePermissions` is
 * optional, and four call sites (the expanded dialog's edit/delete guards and
 * the row action menu's) pass `permissions?.edit` straight through rather than
 * testing truthiness first.
 *
 * Widening the TYPE is all that is needed — the existing body already lands on
 * the right answer: `undefined` is not a boolean, so it falls through to the
 * array branch as `[undefined]`, which no role's permission list contains, and
 * the guard denies. That is the correct default for edit/delete, which are the
 * only keys reaching here unguarded. It matches `""` exactly, which is what the
 * type's own documentation promises.
 */
export const checkPermission = (
  user: any,
  permission: boolean | string | string[] | undefined
) => {
  // 1) If user is Super Admin, grant all permissions
  if (user?.role?.name === "Super Admin") {
    return true;
  }

  // 2) If permission is a boolean, return it
  if (typeof permission === "boolean") {
    return permission;
  }

  // 3) If user has no role, deny
  if (!user?.role) {
    return false;
  }

  // 4) Convert to array if needed
  const requiredPermissions = Array.isArray(permission)
    ? permission
    : [permission];

  // 5) If no permissions required, allow
  if (requiredPermissions.length === 0) {
    return true;
  }

  // 6) Check if the user’s role has any of the required permissions
  const userPermissions = user.role.permissions || [];
  // Extract permission names from objects if needed (permissions can be objects with {id, name})
  const userPermissionNames = userPermissions.map((p: any) => 
    typeof p === 'string' ? p : p.name
  );
  
  return requiredPermissions.some((p) => userPermissionNames.includes(p));
};
