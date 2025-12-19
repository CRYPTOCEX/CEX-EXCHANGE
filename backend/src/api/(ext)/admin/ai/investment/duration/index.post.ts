// /api/admin/ai/investmentDurations/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  aiInvestmentDurationStoreSchema,
  aiInvestmentDurationUpdateSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Create a new AI investment duration",
  operationId: "createAiInvestmentDuration",
  tags: ["Admin", "AI Investment", "Duration"],
  description:
    "Creates a new AI investment duration option. Allows administrators to define new timeframes for AI investment plans.",
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
  logModule: "ADMIN_AI",
  logTitle: "Create investment duration",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { duration, timeframe } = body;

  ctx?.step("Validating duration data");

  ctx?.step("Creating duration record");
  const result = await storeRecord({
    model: "aiInvestmentDuration",
    data: {
      duration,
      timeframe,
    },
  });

  ctx?.success("Duration created successfully");
  return result;
};
