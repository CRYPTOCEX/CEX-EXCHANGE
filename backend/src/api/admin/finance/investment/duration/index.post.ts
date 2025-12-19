// /api/admin/investment/durations/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  investmentDurationStoreSchema,
  investmentDurationUpdateSchema,
} from "./utils";

export const metadata = {
  summary: "Stores a new Investment Duration",
  operationId: "storeInvestmentDuration",
  tags: ["Admin", "Investment Durations"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: investmentDurationUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(
    investmentDurationStoreSchema,
    "Investment Duration"
  ),
  requiresAuth: true,
  permission: "create.investment.duration",
  logModule: "ADMIN_FIN",
  logTitle: "Create Investment Duration",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { duration, timeframe } = body;

  ctx?.step("Validating investment duration data");

  ctx?.step("Creating investment duration record");
  const result = await storeRecord({
    model: "investmentDuration",
    data: {
      duration,
      timeframe,
    },
  });

  ctx?.success("Investment duration created successfully");
  return result;
};
