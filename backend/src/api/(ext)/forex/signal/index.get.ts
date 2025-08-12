import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
  getFiltered,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";

export const metadata = {
  summary: "Get user's Forex signals",
  description: "Retrieves all forex signals available to the current user with pagination",
  operationId: "getUserForexSignals",
  tags: ["Forex", "Signals"],
  requiresAuth: true,
  parameters: crudParameters,
  responses: {
    200: {
      description: "Forex signals retrieved successfully",
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
                    title: { type: "string" },
                    description: { type: "string" },
                    image: { type: "string" },
                    status: { type: "boolean" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
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
    404: notFoundMetadataResponse("Forex Signals"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Get user's forex accounts
    const userAccounts = await models.forexAccount.findAll({
      where: { userId: user.id },
      attributes: ["id"],
    });

    if (userAccounts.length === 0) {
      return {
        data: [],
        pagination: {
          page: 1,
          perPage: query?.perPage || 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const accountIds = userAccounts.map(account => account.id);

    // Use getFiltered for pagination
    return getFiltered({
      model: models.forexSignal,
      query,
      where: { status: true },
      sortField: query?.sortField || "createdAt",
      includeModels: [
        {
          model: models.forexAccount,
          as: "accounts",
          where: { id: accountIds },
          through: { attributes: [] },
          required: false,
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching forex signals:", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
}; 