import { baseStringSchema, baseBooleanSchema } from "@b/utils/schema";

export const baseProductPropertiesSchema = {
  id: baseStringSchema("Unique identifier of the product"),
  name: baseStringSchema("Name of the product"),
  description: baseStringSchema("Description of the product"),
  price: baseStringSchema("Price of the product"),
  stock: baseStringSchema("Stock available for the product"),
};

export const baseCategorySchema = {
  id: baseStringSchema("The unique identifier for the category"),
  name: baseStringSchema("Name of the category"),
  description: baseStringSchema("Description of the category"),
  image: baseStringSchema(
    "URL of the image representing the category",
    255,
    0,
    true
  ),
  status: baseBooleanSchema("Status of the category (active/inactive)"),
  products: {
    type: "array",
    description: "List of active products in this category",
    items: {
      type: "object",
      properties: baseProductPropertiesSchema,
    },
  },
};
