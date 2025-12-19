// /api/admin/forex/durations/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { forexDurationStoreSchema, forexDurationUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Creates a new Forex duration",
  description: "Creates a new Forex duration configuration with specified time value and timeframe unit (HOUR, DAY, WEEK, or MONTH).",
  operationId: "createForexDuration",
  tags: ["Admin", "Forex", "Duration"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Create forex duration",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { duration, timeframe } = body;

  ctx?.step("Validating forex duration data");

  ctx?.step("Creating forex duration");
  const result = await storeRecord({
    model: "forexDuration",
    data: {
      duration,
      timeframe,
    },
  });

  ctx?.success("Forex duration created successfully");
  return result;
};
