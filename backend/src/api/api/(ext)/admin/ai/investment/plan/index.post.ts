// /api/admin/ai/investmentPlans/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  aiInvestmentPlanStoreSchema,
  aiInvestmentPlanUpdateSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new AI Investment Plan",
  operationId: "storeAIInvestmentPlan",
  tags: ["Admin", "AI Investment Plans"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: aiInvestmentPlanUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(
    aiInvestmentPlanStoreSchema,
    "AI Investment Plan"
  ),
  requiresAuth: true,
  permission: "create.ai.investment.plan",
};

export default async (data: Handler) => {
  const { body } = data;
  const {
    name,
    title,
    description,
    image,
    minProfit,
    maxProfit,
    minAmount,
    maxAmount,
    invested,
    profitPercentage,
    status,
    defaultProfit,
    defaultResult,
    trending,
    durations,
  } = body;

  const relations = durations
    ? [
        {
          model: "aiInvestmentPlanDuration",
          method: "addDurations",
          data: durations.map((duration) => duration.value),
          fields: {
            source: "planId",
            target: "durationId",
          },
        },
      ]
    : [];

  return await storeRecord({
    model: "aiInvestmentPlan",
    data: {
      name,
      title,
      description,
      image,
      minProfit,
      maxProfit,
      minAmount,
      maxAmount,
      invested,
      profitPercentage,
      status,
      defaultProfit,
      defaultResult,
      trending,
    },
    relations,
  });
};
