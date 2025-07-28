import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata = {
  summary: "Get user's Forex signals",
  description: "Retrieves all forex signals available to the current user",
  operationId: "getUserForexSignals",
  tags: ["Forex", "Signals"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Forex signals retrieved successfully",
      content: {
        "application/json": {
          schema: {
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
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Signals"),
    500: serverErrorResponse,
  },
};

interface Handler {
  user?: { id: string; [key: string]: any };
}

export default async (data: Handler) => {
  const { user } = data;
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
      return [];
    }

    const accountIds = userAccounts.map(account => account.id);

    // Get signals associated with user's accounts
    const signals = await models.forexSignal.findAll({
      where: { status: true },
      include: [
        {
          model: models.forexAccount,
          as: "accounts",
          where: { id: accountIds },
          through: { attributes: [] },
          required: false,
        },
      ],
      attributes: ["id", "title", "description", "image", "status", "createdAt", "updatedAt"],
    });

    return signals;
  } catch (error) {
    console.error("Error fetching forex signals:", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
}; 