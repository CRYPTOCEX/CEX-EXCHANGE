import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { binaryMarketSchema, BinaryMarketUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a Binary Market",
  operationId: "updateBinaryMarket",
  tags: ["Admin", "Binary Markets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the binary market to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: BinaryMarketUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Binary Market"),
  requiresAuth: true,
  permission: "update.binary.market",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { currency, pair, isTrending, isHot, status } = body;

  const updateData: Record<string, any> = {
    currency,
    pair,
  };

  // Only include fields that are provided
  if (isTrending !== undefined) updateData.isTrending = isTrending;
  if (isHot !== undefined) updateData.isHot = isHot;
  if (status !== undefined) updateData.status = status;

  return await updateRecord(
    "binaryMarket",
    id,
    updateData,
    true // returnResponse
  );
};