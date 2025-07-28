import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Registers a wallet address for the user",
  description: "Registers a wallet address for the authenticated user",
  operationId: "registerWallet",
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
            chainId: {
              type: "number",
              description: "Blockchain chain ID",
            },
          },
          required: ["address", "chainId"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Wallet address registered successfully",
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
      description: "Invalid request (e.g., missing address or chainId)",
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
  const { address, chainId } = body;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "User not authenticated",
    });
  }

  if (!address || !chainId) {
    throw createError({
      statusCode: 400,
      message: "Address and chainId are required",
    });
  }
  try {
    const [provider, created] = await models.providerUser.findOrCreate({
      where: { providerUserId: address, userId: user.id },
      defaults: {
        userId: user.id,
        providerUserId: address,
        provider: "WALLET",
      },
    });

    if (!created) return { message: "Wallet already registered" };

    return { message: "Wallet address registered successfully" };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: "Internal server error",
    });
  }
};
