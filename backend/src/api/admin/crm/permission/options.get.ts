import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Lists all permissions",
  operationId: "listPermissions",
  tags: ["Admin", "CRM", "Permission"],
  responses: {
    200: {
      description: "List of permissions",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "ID of the permission" },
                name: {
                  type: "string",
                  description: "Name of the permission",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Permissions"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  return await models.permission.findAll({
    order: [['name', 'ASC']]
  });
};
