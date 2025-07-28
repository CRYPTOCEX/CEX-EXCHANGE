import { baseStringSchema, baseDateTimeSchema } from "@b/utils/schema";

const id = baseStringSchema("ID of the tag");
const name = baseStringSchema("Name of the tag");
const slug = baseStringSchema(
  "URL-friendly identifier (slug) for the tag",
  255
);
const createdAt = baseDateTimeSchema("Creation date of the tag", true);
const updatedAt = baseDateTimeSchema("Last update date of the tag", true);
const deletedAt = baseDateTimeSchema("Deletion date of the tag", true);

export const tagSchema = {
  id,
  name,
  slug,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseTagSchema = {
  id,
  name,
  slug,
};

export const tagUpdateSchema = {
  type: "object",
  properties: {
    name,
    slug,
  },
  required: ["name", "slug"],
};

export const tagStoreSchema = {
  description: `Tag created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: tagSchema,
      },
    },
  },
};
