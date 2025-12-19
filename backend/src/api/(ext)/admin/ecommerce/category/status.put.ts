import { updateRecordResponses, updateStatus } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk updates ecommerce category status",
  description:
    "Updates the status (active/inactive) of multiple ecommerce categories simultaneously. Set status to true to activate categories or false to deactivate them.",
  operationId: "bulkUpdateEcommerceCategoryStatus",
  tags: ["Admin", "Ecommerce", "Category"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecommerce category IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the ecommerce categories (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
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
  logTitle: "Bulk update category status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Validating ${ids.length} category IDs`);
  ctx?.step(`Updating status to ${status} for ${ids.length} categories`);

  const result = await updateStatus("ecommerceCategory", ids, status);

  ctx?.success(`Successfully updated status for ${ids.length} categories`);
  return result;
};
