import { createError } from "@b/utils/error";
import { models } from "@b/db";
import {
  getAddressFromMessage,
  getChainIdFromMessage,
  returnUserWithTokens,
  verifySignature,
} from "../utils";

export const metadata: OperationObject = {
  summary: "Logs in a user with SIWE",
  description: "Logs in a user using Sign-In With Ethereum (SIWE)",
  operationId: "siweLogin",
  tags: ["Auth"],
  requiresAuth: false,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "SIWE message",
            },
            signature: {
              type: "string",
              description: "Signature of the SIWE message",
            },
          },
          required: ["message", "signature"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "User logged in successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              id: {
                type: "string",
                description: "User ID",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request (e.g., invalid message or signature)",
    },
    401: {
      description: "Unauthorized (e.g., signature verification failed)",
    },
  },
};

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

export default async (data: Handler) => {
  const { body } = data;
  const { message, signature } = body;

  if (!projectId) {
    throw createError({
      statusCode: 500,
      message: "Wallet connect project ID is not defined",
    });
  }

  const address = getAddressFromMessage(message);
  const chainId = getChainIdFromMessage(message);

  const isValid = await verifySignature({
    address,
    message,
    signature,
    chainId,
    projectId,
  });

  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: "Signature verification failed",
    });
  }

  const provider = await models.providerUser.findOne({
    where: { providerUserId: address },
    include: [
      {
        model: models.user,
        as: "user",
        include: [
          {
            model: models.twoFactor,
            as: "twoFactor",
          },
        ],
      },
    ],
  });

  if (!provider) {
    throw createError({
      statusCode: 401,
      message: "Wallet address not recognized",
    });
  }

  const user = provider.user;

  // Validate user status
  if (!user) {
    throw createError({
      statusCode: 404,
      message: "User not found",
    });
  }

  if (user.status === "BANNED") {
    throw createError({
      statusCode: 403,
      message: "Your account has been banned. Please contact support.",
    });
  }

  if (user.status === "SUSPENDED") {
    throw createError({
      statusCode: 403,
      message: "Your account is suspended. Please contact support.",
    });
  }

  if (user.status === "INACTIVE") {
    throw createError({
      statusCode: 403,
      message:
        "Your account is inactive. Please verify your email or contact support.",
    });
  }

  return await returnUserWithTokens({
    user,
    message: "You have been logged in successfully",
  });
};
