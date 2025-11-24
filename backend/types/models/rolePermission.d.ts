


interface rolePermissionAttributes {
  id: number;
  roleId: number;
  permissionId: number;
}

type rolePermissionPk = "id";
type rolePermissionId = rolePermissionAttributes[rolePermissionPk];
type rolePermissionOptionalAttributes = "id";
type rolePermissionCreationAttributes = Optional<
  rolePermissionAttributes,
  rolePermissionOptionalAttributes
>;
