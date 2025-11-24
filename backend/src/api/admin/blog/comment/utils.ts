import { baseStringSchema, baseDateTimeSchema } from "@b/utils/schema";

const id = baseStringSchema("ID of the comment");
const content = baseStringSchema("Content of the comment", 1000);
const userId = baseStringSchema("User ID associated with the comment");
const postId = baseStringSchema("Post ID associated with the comment");
const createdAt = baseDateTimeSchema("Creation date of the comment", true);
const updatedAt = baseDateTimeSchema("Last update date of the comment", true);
const deletedAt = baseDateTimeSchema("Deletion date of the comment", true);

export const commentSchema = {
  id,
  content,
  userId,
  postId,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseCommentSchema = {
  id,
  content,
  userId,
  postId,
  createdAt,
  deletedAt,
  updatedAt,
};

export const commentUpdateSchema = {
  type: "object",
  properties: {
    content,
    userId,
    postId,
  },
  required: ["content"],
};
