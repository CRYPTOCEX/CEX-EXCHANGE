// /api/admin/ai/investmentPlans/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import {
  aiInvestmentPlanStoreSchema,
  aiInvestmentPlanUpdateSchema,
} from "./utils";

export const metadata: OperationObject = {
  summary: "Creates a new AI Investment Plan",
  operationId: "createAiInvestmentPlan",
  tags: ["Admin", "AI Investment", "Plan"],
  description:
    "Creates a new AI Investment Plan with specified parameters including profit ranges, investment amounts, and associated durations. The plan can be set as trending and configured with default results.",
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
  logModule: "ADMIN_AI",
  logTitle: "Create investment plan",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
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

  ctx?.step("Validating plan data");

  const relations = durations
    ? [
        {
          model: "aiInvestmentPlanDuration",
          method: "addDurations",
          data: durations.map((duration) => typeof duration === 'string' ? duration : duration.value),
          fields: {
            source: "planId",
            target: "durationId",
          },
        },
      ]
    : [];

  ctx?.step("Creating plan record");
  const result = await storeRecord({
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

  ctx?.success("Investment plan created successfully");
  return result;
};
