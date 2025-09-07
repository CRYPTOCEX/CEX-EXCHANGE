import { baseStringSchema, baseDateTimeSchema } from "@b/utils/schema";

export const baseCommentSchema = {
  id: baseStringSchema("Comment ID"),
  name: baseStringSchema("Name associated with the comment"),
  slug: baseStringSchema("Slug for the comment"),
};

export const basePostCommentSchema = {
  type: "object",
  properties: {
    id: baseStringSchema("Post ID"),
    content: baseStringSchema("Content of the post"),
    userId: baseStringSchema("User ID of the poster"),
    postId: baseStringSchema("ID of the post commented on"),
    createdAt: baseDateTimeSchema("Creation date of the comment"),
    updatedAt: baseDateTimeSchema("Last update date of the comment"),
    deletedAt: baseDateTimeSchema("Deletion date of the comment", true),
  },
};

export const commentPostsSchema = {
  type: "array",
  items: basePostCommentSchema,
};
