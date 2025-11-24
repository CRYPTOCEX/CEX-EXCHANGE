// /server/api/admin/roles/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { baseRoleSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all roles with pagination and optional filtering",
  operationId: "listRoles",
  tags: ["Admin", "CRM", "Role"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "Paginated list of roles with detailed permission associations",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: baseRoleSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Roles"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.crm.role",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.role,
    query,
    sortField: query.sortField || "name",
    includeModels: [
      {
        model: models.permission,
        as: "permissions",
        through: { attributes: [] },
        attributes: ["id", "name"],
      },
    ],
    timestamps: false,
    excludeRecords: [
      {
        key: "name",
        value: "Super Admin",
      },
    ],
  });
};
