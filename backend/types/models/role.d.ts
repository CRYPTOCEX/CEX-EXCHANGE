interface roleAttributes {
  id: number;
  name: string;
}

type rolePk = "id";
type roleId = roleAttributes[rolePk];
type roleOptionalAttributes = "id";
type roleCreationAttributes = Optional<roleAttributes, roleOptionalAttributes>;
