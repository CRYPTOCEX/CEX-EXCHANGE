// /server/api/auth/role.get.ts
import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Retrieves all roles",
  operationId: "getRoles",
  tags: ["Auth"],
  description: "Retrieves all roles",
  requiresAuth: false,
  responses: {
    200: {
      description: "Roles retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "ID of the role" },
                name: { type: "string", description: "Name of the role" },
                permissions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        description: "ID of the permission",
                      },
                      name: {
                        type: "string",
                        description: "Name of the permission",
                      },
                    },
                    required: ["id", "name"],
                  },
                },
              },
              required: ["id", "name", "permissions"],
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Role"),
    500: serverErrorResponse,
  },
};

export default async () => {
  const roles = await models.role.findAll({
    include: [
      {
        model: models.permission,
        as: "permissions",
        through: { attributes: [] },
        attributes: ["id", "name"],
      },
    ],
  });

  return roles.map((role) => role.get({ plain: true }));
};
