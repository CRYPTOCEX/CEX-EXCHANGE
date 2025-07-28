


interface tagAttributes {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type tagPk = "id";
type tagId = tagAttributes[tagPk];
type tagOptionalAttributes =
  | "id"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";
type tagCreationAttributes = Optional<
  tagAttributes,
  tagOptionalAttributes
>;
