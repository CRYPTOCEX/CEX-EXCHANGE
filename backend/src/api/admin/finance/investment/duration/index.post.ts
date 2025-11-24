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
};

export default async (data: Handler) => {
  const { body } = data;
  const { duration, timeframe } = body;

  return await storeRecord({
    model: "investmentDuration",
    data: {
      duration,
      timeframe,
    },
  });
};
