


interface extensionAttributes {
  id: string;
  productId: string;
  name: string;
  title?: string;
  description?: string;
  link?: string;
  status?: boolean;
  version?: string;
  image?: string;
}

type extensionPk = "id";
type extensionId = extensionAttributes[extensionPk];
type extensionOptionalAttributes =
  | "id"
  | "title"
  | "description"
  | "link"
  | "status"
  | "version"
  | "image";
type extensionCreationAttributes = Optional<
  extensionAttributes,
  extensionOptionalAttributes
>;
