import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { ecommerceCategoryUpdateSchema } from "../utils";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Updates an ecommerce category by ID",
  description:
    "Updates an existing ecommerce category with new information. All fields in the request body will be updated. Partial updates are supported.",
  operationId: "updateEcommerceCategoryById",
  tags: ["Admin", "Ecommerce", "Category"],
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
    description: "Updated category data",
    required: true,
    content: {
      "application/json": {
        schema: ecommerceCategoryUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Category updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Ecommerce category"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ecommerce.category",
  logModule: "ADMIN_ECOM",
  logTitle: "Update category",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { name, description, image, status } = body;

  ctx?.step("Validating category data");
  ctx?.step(`Updating category: ${id}`);

  const result = await updateRecord("ecommerceCategory", id, {
    name,
    description,
    image,
    status,
  });

  ctx?.success("Category updated successfully");
  return result;
};
