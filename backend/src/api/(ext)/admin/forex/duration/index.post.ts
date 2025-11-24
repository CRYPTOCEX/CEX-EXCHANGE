// /api/admin/forex/durations/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { forexDurationStoreSchema, forexDurationUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Forex Duration",
  operationId: "storeForexDuration",
  tags: ["Admin", "Forex Durations"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: forexDurationUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(forexDurationStoreSchema, "Forex Duration"),
  requiresAuth: true,
  permission: "create.forex.duration",
};

export default async (data: Handler) => {
  const { body } = data;
  const { duration, timeframe } = body;

  return await storeRecord({
    model: "forexDuration",
    data: {
      duration,
      timeframe,
    },
  });
};
