import { createError } from "@b/utils/error";
import { setEncryptionKey } from "@b/utils/encrypt";

export const metadata: OperationObject = {
  summary: "Sets a new passphrase for the Hardware Security Module (HSM)",
  description:
    "This endpoint allows admin users to set or update the passphrase for HSM operations.",
  operationId: "setPassphrase",
  tags: ["Admin", "Ecosystem", "KMS"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            passphrase: {
              type: "string",
              description: "The passphrase to set for the HSM",
            },
          },
          required: ["passphrase"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Passphrase set successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string", description: "Success message" },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid request or passphrase not provided",
    },
    401: {
      description: "Unauthorized, only admin users can perform this action",
    },
    500: {
      description: "Internal server error or encryption key setting failed",
    },
  },
  permission: "access.ecosystem",
};

export default async (data: Handler) => {
  const { body } = data;

  const { passphrase } = body;
  if (!passphrase) {
    throw createError({ statusCode: 400, message: "Passphrase is required" });
  }

  const success = await setEncryptionKey(passphrase);
  if (success) {
    return { message: "Encryption key set successfully." };
  } else {
    throw new Error("Failed to set encryption key");
  }
};
