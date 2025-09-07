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
};

export default async (data: Handler) => {
  const { body } = data;
  const { currency, pair, isTrending, isHot, status } = body;

  return await storeRecord({
    model: "binaryMarket",
    data: {
      currency,
      pair,
      isTrending: isTrending !== undefined ? isTrending : false,
      isHot: isHot !== undefined ? isHot : false,
      status: status !== undefined ? status : true,
    },
  });
};