import {
  deleteRecordParams,
  handleSingleDelete,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { notFoundResponse } from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Deletes an ecosystem token",
  description:
    "Deletes a specific ecosystem token by its ID. This operation performs a soft delete, marking the token as deleted without permanently removing it from the database.",
  operationId: "deleteEcosystemToken",
  tags: ["Admin", "Ecosystem", "Token"],
  parameters: deleteRecordParams("Ecosystem Token"),
  responses: {
    200: {
      description: "Ecosystem token deleted successfully",
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
    404: notFoundResponse("Ecosystem Token"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "delete.ecosystem.token",
  logModule: "ADMIN_ECO",
  logTitle: "Delete token",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Deleting token");
  const result = await handleSingleDelete({
    model: "ecosystemToken",
    id: params.id,
    query,
  });

  ctx?.success("Token deleted successfully");
  return result;
};
