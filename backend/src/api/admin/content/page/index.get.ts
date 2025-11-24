// /server/api/admin/pages/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { basePageSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "List all pages",
  operationId: "listPages",
  tags: ["Admin", "Content", "Page"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Pages retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: basePageSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Pages"),
    500: serverErrorResponse,
  },
  permission: "view.page",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { query } = data;
  return getFiltered({
    model: models.page,
    query,
    sortField: query.sortField || "createdAt",
  });
};
