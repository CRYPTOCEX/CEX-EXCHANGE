import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata = {
  summary: "Get signals for a specific Forex account",
  description: "Retrieves all signals associated with a specific forex account",
  operationId: "getForexAccountSignals",
  tags: ["Forex", "Account", "Signals"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex account",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Account signals retrieved successfully",
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
    404: notFoundMetadataResponse("Forex Account"),
    500: serverErrorResponse,
  },
};

interface Handler {
  user?: { id: string; [key: string]: any };
  params: { id: string };
}

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;

  try {
    // Check if account exists and belongs to user
    const account = await models.forexAccount.findOne({
      where: { id, userId: user.id },
    });

    if (!account) {
      throw createError({ statusCode: 404, message: "Forex Account not found" });
    }

    // Get signals associated with this account
    const signals = await models.forexSignal.findAll({
      include: [
        {
          model: models.forexAccount,
          as: "accounts",
          where: { id },
          through: { attributes: [] },
          required: true,
        },
      ],
      where: { status: true },
      attributes: ["id", "title", "description", "image", "status", "createdAt", "updatedAt"],
      order: [["createdAt", "DESC"]],
    });

    return signals;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching account signals:", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
}; 