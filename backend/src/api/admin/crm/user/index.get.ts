// /server/api/admin/crm/users/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { userSchema } from "./utils";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Lists users with pagination and optional filtering",
  operationId: "listUsers",
  tags: ["Admin", "CRM", "User"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "List of users with pagination information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: userSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Users"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.user",
};

export default async (data: Handler) => {
  const { query } = data;

  if (query.all === "true") {
    const users = await models.user.findAll({
      attributes: {
        exclude: [
          "password", // Never expose password
          "metadata",
        ],
      },
      include: [
        {
          model: models.role,
          as: "role",
          attributes: ["id", "name"],
        },
      ],
      where: {
        "$role.name$": { [Op.ne]: "Super Admin" },
      },
    });

    return {
      data: users,
      pagination: null, // No pagination for `all=true`
    };
  }

  // Simplified user list - detailed data is handled by individual user page
  const result = await getFiltered({
    model: models.user,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.role,
        as: "role",
        required: true,
        attributes: ["id", "name"],
      },
      {
        model: models.kycApplication,
        as: "kyc",
        required: false,
        attributes: ["id", "status"],
      },
      {
        model: models.twoFactor,
        as: "twoFactor",
        required: false,
        attributes: ["id", "enabled", "type"],
      },
      {
        model: models.userBlock,
        as: "blocks",
        required: false,
        attributes: ["id", "isActive"],
      },
    ],
    excludeFields: [
      "password", // Never expose password
      "metadata",
    ],
    excludeRecords: [
      {
        model: models.role,
        key: "name",
        value: "Super Admin",
      },
    ],
  });

  return result;
};
