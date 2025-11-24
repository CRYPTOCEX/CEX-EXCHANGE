// /api/admin/ai/investmentDurations/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  aiInvestmentDurationStoreSchema,
  aiInvestmentDurationUpdateSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new AI Investment Duration",
  operationId: "storeAIInvestmentDuration",
  tags: ["Admin", "AI Investment Durations"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: aiInvestmentDurationUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(
    aiInvestmentDurationStoreSchema,
    "AI Investment Duration"
  ),
  requiresAuth: true,
  permission: "create.ai.investment.duration",
};

export default async (data: Handler) => {
  const { body } = data;
  const { duration, timeframe } = body;

  return await storeRecord({
    model: "aiInvestmentDuration",
    data: {
      duration,
      timeframe,
    },
  });
};
