// /server/api/exchange/settings/activate-license.post.ts

import { activateLicense } from "@b/api/admin/system/utils";
import { saveLicense } from "../../utils";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata = {
  summary: "Activate Exchange License",
  operationId: "activateLicense",
  tags: ["Admin", "Settings", "Exchange"],
  description: "Activates the license for the exchange product.",
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      in: "path",
      name: "productId",
      description: "Product ID whose license to activate",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description:
      "Product ID, purchase code, and envato username for license activation.",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            purchaseCode: {
              type: "string",
              description: "Purchase code for the license.",
            },
            envatoUsername: { type: "string", description: "Envato username." },
          },
          required: ["purchaseCode", "envatoUsername"],
        },
      },
    },
    required: true,
  },
  responses: {
    200: {
      description: "License activated successfully",
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("License"),
    500: serverErrorResponse,
  },
  permission: "edit.exchange",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { purchaseCode, envatoUsername } = body;
  const { productId } = params;

  if (!productId || !purchaseCode || !envatoUsername) {
    throw new Error("All fields are required for license activation.");
  }

  const response = await activateLicense(
    productId,
    purchaseCode,
    envatoUsername
  );
  if (response.lic_response) {
    await saveLicense(productId, envatoUsername);
  }
  return response;
};
