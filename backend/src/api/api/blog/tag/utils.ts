import { baseStringSchema, baseDateTimeSchema } from "@b/utils/schema";

export const baseTagSchema = {
  id: baseStringSchema("Tag ID"),
  name: baseStringSchema("Name of the tag"),
  slug: baseStringSchema("Slug for the tag"),
};

export const basePostTagSchema = {
  type: "object",
  properties: {
    id: baseStringSchema("Post ID"),
    title: baseStringSchema("Title of the post"),
    content: baseStringSchema("Content of the post"),
    authorId: baseStringSchema("Author ID of the post"),
    categoryId: baseStringSchema("Category ID of the post"),
    slug: baseStringSchema("Slug of the post"),
    createdAt: baseDateTimeSchema("Creation date of the post"),
    updatedAt: baseDateTimeSchema("Last update date of the post", true),
  },
};

export const tagPostsSchema = {
  type: "array",
  items: basePostTagSchema,
};
