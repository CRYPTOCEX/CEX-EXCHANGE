// /server/api/admin/roles/index.get.ts

import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseRoleSchema } from "./utils";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Lists all roles with pagination and optional filtering",
  operationId: "listRoles",
  tags: ["Admin", "CRM", "Role"],
  responses: {
    200: {
      description:
        "Paginated list of roles with detailed permission associations",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseRoleSchema,
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
  permission: "access.role",
};

export default async (data: Handler) => {
  return await models.role.findAll({
    where: {
      name: {
        [Op.ne]: "Super Admin",
      },
    },
  });
};
