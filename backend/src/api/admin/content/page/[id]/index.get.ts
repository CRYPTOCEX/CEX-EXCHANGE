// /server/api/admin/pages/[id].get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { basePageSchema } from "../utils"; // Assuming the schema is in a separate file.

export const metadata: OperationObject = {
  summary: "Retrieves a specific CMS page by ID",
  operationId: "getCmsPageById",
  tags: ["Admin", "Content", "Page"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the CMS page to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "CMS page details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: basePageSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("CMS page not found"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.page",
};

export default async (data: Handler) => {
  const { params } = data;

  return await getRecord("page", params.id);
};
