import { getEcosystemToken } from "@b/api/(ext)/ecosystem/utils/tokens";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseTokenSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a specific ecosystem token",
  description: "Fetches details of a specific token in the ecosystem.",
  operationId: "getEcosystemToken",
  tags: ["Ecosystem", "Tokens"],
  parameters: [
    {
      name: "chain",
      in: "path",
      required: true,
      schema: { type: "string", description: "Blockchain chain name" },
    },
    {
      name: "currency",
      in: "path",
      required: true,
      schema: { type: "string", description: "Currency code of the token" },
    },
  ],
  responses: {
    200: {
      description: "Token details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseTokenSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Token"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { params } = data;
  const { chain, currency } = params;
  return await getEcosystemToken(chain, currency);
};
