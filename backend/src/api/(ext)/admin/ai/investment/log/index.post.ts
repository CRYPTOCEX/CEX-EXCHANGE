// /api/admin/ai/investments/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { aiInvestmentStoreSchema, aiInvestmentUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new AI Investment",
  operationId: "storeAIInvestment",
  tags: ["Admin", "AI Investments"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: aiInvestmentUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(aiInvestmentStoreSchema, "AI Investment"),
  requiresAuth: true,
  permission: "create.ai.investment",
};

export default async (data: Handler) => {
  const { body } = data;
  const { userId, planId, durationId, symbol, amount, profit, result, status } =
    body;

  return await storeRecord({
    model: "aiInvestment",
    data: {
      userId,
      planId,
      durationId,
      symbol,
      amount,
      profit,
      result,
      status,
    },
  });
};
