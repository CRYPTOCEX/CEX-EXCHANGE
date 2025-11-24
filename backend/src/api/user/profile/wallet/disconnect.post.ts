import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Disconnects a wallet address for the user",
  description:
    "Disconnects a wallet address for the authenticated user and removes the record from providerUser",
  operationId: "disconnectWallet",
  tags: ["Auth"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "Wallet address",
            },
          },
          required: ["address"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Wallet address disconnected successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request (e.g., missing address)",
    },
    401: {
      description: "Unauthorized (e.g., user not authenticated)",
    },
    500: {
      description: "Internal server error",
    },
  },
};

export default async (data: Handler) => {
  const { body, user } = data;
  const { address } = body;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "User not authenticated",
    });
  }

  if (!address) {
    throw createError({
      statusCode: 400,
      message: "Address is required",
    });
  }

  try {
    const provider = await models.providerUser.findOne({
      where: { providerUserId: address, userId: user.id },
    });

    if (!provider) {
      throw createError({
        statusCode: 400,
        message: "Wallet not registered",
      });
    }

    await provider.destroy({ force: true });

    return { message: "Wallet address disconnected successfully" };
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
      message: "Internal server error",
    });
  }
};
