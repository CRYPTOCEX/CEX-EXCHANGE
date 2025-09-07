import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseForexAccountSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a specific Forex account by ID",
  description:
    "Fetches a specific Forex account by its ID for the currently authenticated user.",
  operationId: "getForexAccountById",
  tags: ["Forex", "Accounts"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Account ID" },
    },
  ],
  responses: {
    200: {
      description: "Forex account retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseForexAccountSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Account"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const account = await await models.forexAccount.findOne({
    where: { id: params.id, userId: user.id },
  });

  if (!account) {
    throw createError({
      statusCode: 404,
      message: "Forex account not found",
    });
  }
  return account;
};
