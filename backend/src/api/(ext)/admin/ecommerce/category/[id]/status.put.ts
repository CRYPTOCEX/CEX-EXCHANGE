import { updateStatus, updateRecordResponses } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Updates an ecommerce category status by ID",
  description:
    "Updates the status (active/inactive) of a specific ecommerce category. Set status to true to activate the category or false to deactivate it.",
  operationId: "updateEcommerceCategoryStatusById",
  tags: ["Admin", "Ecommerce", "Category"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecommerce category to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply to the ecommerce category (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Category status updated successfully",
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
  logTitle: "Update category status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating status data");
  ctx?.step(`Updating category status: ${id} to ${status}`);

  const result = await updateStatus("ecommerceCategory", id, status);

  ctx?.success("Category status updated successfully");
  return result;
};
