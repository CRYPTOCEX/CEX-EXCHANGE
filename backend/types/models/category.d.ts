interface categoryAttributes {
  id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type categoryPk = "id";
type categoryId = categoryAttributes[categoryPk];
type categoryOptionalAttributes =
  | "id"
  | "image"
  | "description"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";
type categoryCreationAttributes = Optional<
  categoryAttributes,
  categoryOptionalAttributes
>;
