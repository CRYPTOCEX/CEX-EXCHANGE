import { models } from "@b/db";
import { binaryMarketSchema } from "../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";

export const metadata = {
  summary:
    "Retrieves detailed information of a specific binary market by ID",
  operationId: "getBinaryMarketById",
  tags: ["Admin", "Binary Markets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the binary market to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Binary market details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: binaryMarketSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary Market"),
    500: serverErrorResponse,
  },
  permission: "view.binary.market",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params } = data;
  const { id } = params;

  const binaryMarket = await models.binaryMarket.findOne({
    where: { id },
  });

  if (!binaryMarket) {
    throw new Error("Binary market not found");
  }

  return binaryMarket;
};