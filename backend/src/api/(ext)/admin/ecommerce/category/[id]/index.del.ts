import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Deletes an ecommerce category by ID",
  description:
    "Permanently deletes a specific ecommerce category by its ID. This operation cannot be undone. All related data will be affected according to the cascade rules defined in the database.",
  operationId: "deleteEcommerceCategoryById",
  tags: ["Admin", "Ecommerce", "Category"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecommerce category to delete",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description: "Category deleted successfully",
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
    401: unauthorizedResponse,
    404: notFoundResponse("Ecommerce category"),
    500: serverErrorResponse,
  },
  permission: "delete.ecommerce.category",
  requiresAuth: true,
  logModule: "ADMIN_ECOM",
  logTitle: "Delete category",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Validating category ID");
  ctx?.step(`Deleting category: ${params.id}`);

  const result = await handleSingleDelete({
    model: "ecommerceCategory",
    id: params.id,
    query,
  });

  ctx?.success("Category deleted successfully");
  return result;
};
