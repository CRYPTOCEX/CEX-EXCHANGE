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
  logModule: "ADMIN_BINARY",
  logTitle: "Update binary market",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { currency, pair, isTrending, isHot, status } = body;

  ctx?.step("Fetching binary market record");

  const updateData: Record<string, any> = {
    currency,
    pair,
  };

  // Only include fields that are provided
  if (isTrending !== undefined) updateData.isTrending = isTrending;
  if (isHot !== undefined) updateData.isHot = isHot;
  if (status !== undefined) updateData.status = status;

  ctx?.step("Updating binary market");
  const result = await updateRecord(
    "binaryMarket",
    id,
    updateData,
    true // returnResponse
  );

  ctx?.success("Binary market updated successfully");
  return result;
};