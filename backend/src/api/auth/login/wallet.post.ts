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
  logModule: "LOGIN",
  logTitle: "Wallet login",
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
  const { body, ctx } = data;
  const { message, signature } = body;

  try {
    ctx?.step("Validating wallet login request");
    if (!message || !signature) {
      ctx?.fail("Message and signature are required");
      throw createError({
        statusCode: 400,
        message: "Message and signature are required",
      });
    }

    ctx?.step("Checking WalletConnect configuration");
    if (!projectId) {
      ctx?.fail("WalletConnect project ID not configured");
      throw createError({
        statusCode: 500,
        message: "Wallet connect project ID is not defined",
      });
    }

    ctx?.step("Extracting wallet address and chain ID");
    const address = getAddressFromMessage(message);
    const chainId = getChainIdFromMessage(message);

    ctx?.step(`Verifying signature for address: ${address}`);
    const isValid = await verifySignature({
      address,
      message,
      signature,
      chainId,
      projectId,
    });

    if (!isValid) {
      ctx?.fail("Signature verification failed");
      throw createError({
        statusCode: 401,
        message: "Signature verification failed",
      });
    }

    ctx?.step("Looking up wallet provider");
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
      ctx?.fail("Wallet address not recognized");
      throw createError({
        statusCode: 401,
        message: "Wallet address not recognized",
      });
    }

    const user = provider.user;

    ctx?.step("Validating user status");
    // Validate user status
    if (!user) {
      ctx?.fail("User not found");
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    if (user.status === "BANNED") {
      ctx?.fail("Account banned");
      throw createError({
        statusCode: 403,
        message: "Your account has been banned. Please contact support.",
      });
    }

    if (user.status === "SUSPENDED") {
      ctx?.fail("Account suspended");
      throw createError({
        statusCode: 403,
        message: "Your account is suspended. Please contact support.",
      });
    }

    if (user.status === "INACTIVE") {
      ctx?.fail("Account inactive");
      throw createError({
        statusCode: 403,
        message:
          "Your account is inactive. Please verify your email or contact support.",
      });
    }

    ctx?.step("Generating session tokens");
    const result = await returnUserWithTokens({
      user,
      message: "You have been logged in successfully",
    });

    ctx?.success(`User ${user.email} logged in with wallet ${address}`);
    return result;
  } catch (error) {
    ctx?.fail(error.message || "Wallet login failed");
    throw error;
  }
};
