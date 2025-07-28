// utils.ts

import {
  baseDateTimeSchema,
  baseEnumSchema,
  baseStringSchema,
} from "@b/utils/schema";

export const baseCategorySchema = {
  id: baseStringSchema("Category ID"),
  name: baseStringSchema("Name of the category"),
  slug: baseStringSchema("Slug for the category"),
  image: baseStringSchema("Image URL for the category", 255, 0, true),
  description: baseStringSchema("Description of the category", 255, 0, true),
};

export const basePostSchema = {
  id: baseStringSchema("Post ID"),
  title: baseStringSchema("Title of the post"),
  content: baseStringSchema("Content of the post"),
  categoryId: baseStringSchema("Category ID of the post"),
  authorId: baseStringSchema("Author ID of the post"),
  slug: baseStringSchema("Slug of the post"),
  description: baseStringSchema("Description of the post", 255, 0, true),
  status: baseEnumSchema("Status of the post", ["PUBLISHED", "DRAFT", "TRASH"]),
  image: baseStringSchema("Image URL of the post", 255, 0, true),
  createdAt: baseDateTimeSchema("Creation date of the post"),
  updatedAt: baseDateTimeSchema("Last update date of the post", true),
};

export const categoryPostsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: basePostSchema,
  },
  nullable: true,
};
