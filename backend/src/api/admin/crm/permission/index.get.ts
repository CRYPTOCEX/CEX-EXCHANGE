// /server/api/admin/permissions/index.get.ts

import { models } from "@b/db";
import { getFiltered } from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";

export const metadata: OperationObject = {
  summary: "Lists all permissions with pagination and optional filtering",
  operationId: "listPermissions",
  tags: ["Admin", "CRM", "Permission"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of permissions with details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "ID of the permission" },
                    name: {
                      type: "string",
                      description: "Name of the permission",
                    },
                    rolePermissions: {
                      type: "array",
                      description:
                        "List of roles associated with the permission",
                      items: {
                        type: "object",
                        properties: {
                          roleId: {
                            type: "string",
                            description: "ID of the role",
                          },
                        },
                      },
                    },
                  },
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: { description: "Unauthorized, admin permission required" },
    500: { description: "Internal server error" },
  },
  requiresAuth: true,
  permission: "view.permission",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.permission,
    query,
    sortField: query.sortField || "name",
    includeModels: [
      {
        model: models.role,
        as: "roles",
        through: { attributes: [] },
      },
    ],
    timestamps: false,
  });
};
