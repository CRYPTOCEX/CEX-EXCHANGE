import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { BinaryMarketStoreSchema, BinaryMarketUpdateSchema } from "./utils";

export const metadata = {
  summary: "Stores a new Binary Market",
  operationId: "storeBinaryMarket",
  tags: ["Admin", "Binary Markets"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: BinaryMarketUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(BinaryMarketStoreSchema, "Binary Market"),
  requiresAuth: true,
  permission: "create.binary.market",
  logModule: "ADMIN_BINARY",
  logTitle: "Create binary market",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { currency, pair, isTrending, isHot, status } = body;

  ctx?.step("Validating binary market data");

  ctx?.step("Creating binary market record");
  const result = await storeRecord({
    model: "binaryMarket",
    data: {
      currency,
      pair,
      isTrending: isTrending !== undefined ? isTrending : false,
      isHot: isHot !== undefined ? isHot : false,
      status: status !== undefined ? status : true,
    },
  });

  ctx?.success("Binary market created successfully");
  return result;
};