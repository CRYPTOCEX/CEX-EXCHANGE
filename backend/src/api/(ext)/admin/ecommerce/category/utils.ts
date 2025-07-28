import { baseStringSchema, baseBooleanSchema } from "@b/utils/schema";

const id = baseStringSchema("ID of the e-commerce category");
const name = baseStringSchema("Name of the e-commerce category", 191);
const description = baseStringSchema("Description of the e-commerce category");
const image = baseStringSchema(
  "URL to the image of the e-commerce category",
  191,
  0,
  true,
  null,
  "URL"
);
const status = baseBooleanSchema("Status of the e-commerce category");

export const ecommerceCategorySchema = {
  id,
  name,
  description,
  image,
  status,
};

export const baseEcommerceCategorySchema = {
  id,
  name,
  description,
  image,
  status,
};

export const ecommerceCategoryUpdateSchema = {
  type: "object",
  properties: {
    name,
    description,
    image,
    status,
  },
  required: ["name", "description", "status"],
};

export const ecommerceCategoryStoreSchema = {
  description: `Category created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: baseEcommerceCategorySchema,
      },
    },
  },
};
