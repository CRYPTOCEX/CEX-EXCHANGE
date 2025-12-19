import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { ecommerceProductUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific ecommerce product by ID",
  operationId: "updateEcommerceProduct",
  tags: ["Admin", "Ecommerce", "Product"],
  description: "Updates an existing ecommerce product with new information. All product fields can be modified including name, description, price, inventory, category, and status.",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecommerce product to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "Updated product data",
    content: {
      "application/json": {
        schema: ecommerceProductUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Product"),
  requiresAuth: true,
  permission: "edit.ecommerce.product",
  logModule: "ADMIN_ECOM",
  logTitle: "Update Ecommerce Product",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const {
    name,
    description,
    shortDescription,
    type,
    price,
    status,
    image,
    currency,
    walletType,
    inventoryQuantity,
  } = body;

  ctx?.step("Updating E-commerce product");
  const result = await updateRecord("ecommerceProduct", id, {
    name,
    description,
    shortDescription,
    type,
    price,
    status,
    image,
    currency,
    walletType,
    inventoryQuantity,
  });

  ctx?.success("Successfully updated E-commerce product");
  return result;
};
