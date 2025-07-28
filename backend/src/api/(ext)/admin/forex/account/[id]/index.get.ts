import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseForexAccountSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific forex account by ID",
  operationId: "getForexAccountById",
  tags: ["Admin", "Forex Accounts"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex account to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Forex account details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseForexAccountSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Account"),
    500: serverErrorResponse,
  },
  permission: "view.forex.account",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("forexAccount", params.id, [
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
  ]);
};
