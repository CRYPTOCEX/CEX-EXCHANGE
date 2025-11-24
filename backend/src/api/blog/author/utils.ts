// utils/schema.ts

import {
  baseDateTimeSchema,
  baseEnumSchema,
  baseStringSchema,
} from "@b/utils/schema";

export const baseIdSchema = baseStringSchema("Generic ID");
export const baseUserIdSchema = baseStringSchema(
  "User ID associated with the entity"
);
export const baseStatusSchema = baseEnumSchema("Current status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export const baseUserObjectSchema = {
  type: "object",
  properties: {
    id: baseIdSchema,
    firstName: baseStringSchema("First name of the user"),
    lastName: baseStringSchema("Last name of the user"),
    avatar: baseStringSchema("Avatar URL of the user", 255, 0, true),
  },
};
export const basePostItemSchema = {
  type: "object",
  properties: {
    id: baseIdSchema,
    title: baseStringSchema("Title of the post"),
    content: baseStringSchema("Content of the post"),
    categoryId: baseIdSchema,
    authorId: baseIdSchema,
    slug: baseStringSchema("Slug of the post"),
    description: baseStringSchema("Description of the post", 255, 0, true),
    status: baseEnumSchema("Post status", ["PUBLISHED", "DRAFT", "TRASH"]),
    image: baseStringSchema("Image URL of the post", 255, 0, true),
    createdAt: baseDateTimeSchema("Creation date of the post"),
    updatedAt: baseDateTimeSchema("Last update date of the post", true),
  },
};

export const baseAuthorPropertiesSchema = {
  id: baseIdSchema,
  userId: baseUserIdSchema,
  status: baseStatusSchema,
  user: baseUserObjectSchema,
  posts: {
    type: "array",
    items: basePostItemSchema,
    nullable: true,
  },
};

export const baseAuthorSchema = {
  type: "object",
  properties: baseAuthorPropertiesSchema,
};
