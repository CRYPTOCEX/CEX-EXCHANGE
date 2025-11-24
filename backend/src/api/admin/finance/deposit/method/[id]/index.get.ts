// /server/api/admin/deposit/methods/[id].get.ts

import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { methodSchema } from "../utils"; // Ensure the schema is adjusted to include only the fields needed.

export const metadata = {
  summary: "Retrieves detailed information of a specific deposit method by ID",
  operationId: "getDepositMethodById",
  tags: ["Admin", "Deposit Methods"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the deposit method to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Deposit method details",
      content: {
        "application/json": {
          schema: methodSchema,
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Deposit Method"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.deposit.method",
};

export default async (data: Handler) => {
  const { params } = data;

  return await getRecord("depositMethod", params.id);
};
