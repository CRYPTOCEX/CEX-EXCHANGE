import {
  baseStringSchema,
  baseDateTimeSchema,
  baseEnumSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the Post");
const title = baseStringSchema("Title of the Post");
const content = {
  type: "string",
  description: "Content of the Post",
};
const categoryId = baseStringSchema("Category ID linked to the Post");
const authorId = baseStringSchema("Author ID who wrote the Post");
const slug = baseStringSchema("Slug for the Post URL");
const description = baseStringSchema("Description of the Post");
const status = baseEnumSchema("Publication status of the Post", [
  "PUBLISHED",
  "DRAFT",
  "TRASH",
]);
const image = baseStringSchema("Image URL of the Post");
const createdAt = baseDateTimeSchema("Creation date of the Post");
const updatedAt = baseDateTimeSchema("Last update date of the Post");
const deletedAt = baseDateTimeSchema(
  "Deletion date of the Post, if applicable"
);

export const basePostSchema = {
  id,
  title,
  content,
  categoryId,
  authorId,
  slug,
  description,
  status,
  image,
  createdAt,
  updatedAt,
  deletedAt,
};

export const postUpdateSchema = {
  type: "object",
  properties: {
    title,
    content,
    categoryId,
    authorId,
    slug,
    description,
    status,
    image,
  },
  required: ["title", "content", "categoryId", "authorId", "slug", "status"],
};

export const postStoreSchema = {
  description: `Post created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: basePostSchema,
      },
    },
  },
};
