import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { ecommerceCategoryUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific ecommerce category",
  operationId: "updateEcommerceCategory",
  tags: ["Admin", "Ecommerce", "Categories"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecommerce category to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the ecommerce category",
    content: {
      "application/json": {
        schema: ecommerceCategoryUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Category"),
  requiresAuth: true,
  permission: "edit.ecommerce.category",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { name, description, image, status } = body;

  return await updateRecord("ecommerceCategory", id, {
    name,
    description,
    image,
    status,
  });
};
