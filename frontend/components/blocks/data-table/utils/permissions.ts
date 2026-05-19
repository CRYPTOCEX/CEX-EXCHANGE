// utils/permissions.ts

export const checkPermission = (
  user: any,
  permission: boolean | string | string[]
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
