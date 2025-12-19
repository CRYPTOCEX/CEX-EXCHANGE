import { createError } from "@b/utils/error";
import { setEncryptionKey } from "@b/utils/encrypt";
import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
  successMessageResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Set Hardware Security Module (HSM) passphrase",
  description:
    "Sets or updates the passphrase for Hardware Security Module (HSM) operations used in the ecosystem. This passphrase is used for encrypting sensitive data such as private keys and wallet information. Only administrators with ecosystem access can perform this action.",
  operationId: "setEcosystemKmsPassphrase",
  tags: ["Admin", "Ecosystem", "KMS"],
  logModule: "ADMIN_ECO",
  logTitle: "Set HSM passphrase",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            passphrase: {
              type: "string",
              description: "The passphrase to set for the HSM encryption operations (required)",
            },
          },
          required: ["passphrase"],
        },
      },
    },
  },
  responses: {
    200: successMessageResponse("Encryption key set successfully"),
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "access.ecosystem",
};

export default async (data: Handler) => {
  const { body, ctx } = data;

  const { passphrase } = body;
  if (!passphrase) {
    throw createError({ statusCode: 400, message: "Passphrase is required" });
  }

  ctx?.step("Setting encryption key");
  const success = await setEncryptionKey(passphrase);
  if (success) {
    ctx?.success("Encryption key set successfully");
    return { message: "Encryption key set successfully." };
  } else {
    ctx?.fail("Failed to set encryption key");
    throw new Error("Failed to set encryption key");
  }
};
