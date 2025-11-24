import { baseStringSchema, baseDateTimeSchema } from "@b/utils/schema";

const id = baseStringSchema("ID of the category");
const name = baseStringSchema("Name of the category");
const slug = baseStringSchema(
  "URL-friendly identifier (slug) for the category",
  255
);
const image = baseStringSchema("Image URL of the category", 1000, 0, true);
const description = baseStringSchema(
  "Description of the category",
  1000,
  0,
  true
);
const createdAt = baseDateTimeSchema("Creation date of the category", true);
const updatedAt = baseDateTimeSchema("Last update date of the category", true);
const deletedAt = baseDateTimeSchema("Deletion date of the category", true);

export const categorySchema = {
  id,
  name,
  slug,
  image,
  description,
  createdAt,
  updatedAt,
  deletedAt,
};

export const baseCategorySchema = {
  id,
  name,
  slug,
  image,
  description,
};

export const categoryUpdateSchema = {
  type: "object",
  properties: {
    name,
    slug,
    image,
    description,
  },
  required: ["name", "slug"],
};

export const categoryStoreSchema = {
  description: `Category created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: categorySchema,
      },
    },
  },
};
