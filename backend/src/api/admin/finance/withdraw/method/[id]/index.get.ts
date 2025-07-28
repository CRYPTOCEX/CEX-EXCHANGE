// /server/api/admin/withdraw/methods/[id].get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseWithdrawMethodSchema } from "../utils"; // Ensure the schema is adjusted and located in a separate file.

export const metadata = {
  summary: "Retrieves a specific withdrawal method by ID",
  operationId: "getWithdrawMethodById",
  tags: ["Admin", "Withdraw Methods"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the withdrawal method to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Withdraw method details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseWithdrawMethodSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Withdraw method not found"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.withdraw.method",
};

export default async (data: Handler) => {
  const { params } = data;

  return await getRecord("withdrawMethod", params.id);
};
