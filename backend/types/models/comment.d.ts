interface commentAttributes {
  id: string;
  content: string;
  userId: string;
  postId: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type commentPk = "id";
type commentId = commentAttributes[commentPk];
type commentOptionalAttributes = "id" | "createdAt" | "deletedAt" | "updatedAt";
type commentCreationAttributes = Optional<
  commentAttributes,
  commentOptionalAttributes
>;
