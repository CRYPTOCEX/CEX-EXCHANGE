// /server/api/admin/apiKeys/index.get.ts

import { models } from "@b/db";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Lists all API keys with pagination and optional user filtering",
  operationId: "listAPIKeys",
  tags: ["Admin", "API Keys"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of API keys with user details and pagination information",
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
                    id: { type: "string" },
                    userId: { type: "string" },
                    name: { type: "string" },
                    key: { type: "string" },
                    permissions: {
                      type: "array",
                      items: { type: "string" },
                    },
                    ipWhitelist: {
                      type: "array",
                      items: { type: "string" },
                    },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                    user: {
                      type: "object",
                      properties: {
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string" },
                        avatar: { type: "string" },
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
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("API Keys"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.api.key",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.apiKey,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
        required: false,
      },
    ],
  });
};
