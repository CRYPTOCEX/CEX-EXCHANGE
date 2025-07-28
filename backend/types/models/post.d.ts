interface postAttributes {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  authorId: string;
  slug: string;
  description?: string;
  status: "PUBLISHED" | "DRAFT";
  image?: string;
  views?: number;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type postPk = "id";
type postId = postAttributes[postPk];
type postOptionalAttributes =
  | "id"
  | "description"
  | "status"
  | "image"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type postCreationAttributes = Optional<postAttributes, postOptionalAttributes>;
