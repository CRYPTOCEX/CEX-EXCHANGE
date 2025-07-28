// /server/api/auth/nonce.get.ts
import { randomBytes } from "crypto";

export const metadata: OperationObject = {
  summary: "Generates a nonce for client use",
  operationId: "generateNonce",
  tags: ["Auth"],
  description: "Generates a nonce for client use",
  requiresAuth: false,
  responses: {
    200: {
      description: "Nonce generated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              nonce: { type: "string", description: "The generated nonce" },
            },
            required: ["nonce"],
          },
        },
      },
    },
    500: {
      description: "Internal server error",
    },
  },
};

export default () => {
  const nonce = randomBytes(16).toString("hex");
  return nonce;
};
