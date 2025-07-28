// /api/admin/investment/plans/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { investmentPlanStoreSchema, investmentPlanUpdateSchema } from "./utils";

export const metadata = {
  summary: "Stores a new Investment Plan",
  operationId: "storeInvestmentPlan",
  tags: ["Admin", "Investment Plans"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: investmentPlanUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(investmentPlanStoreSchema, "Investment Plan"),
  requiresAuth: true,
  permission: "create.investment.plan",
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
    currency,
    walletType,
  } = body;

  const relations = durations
    ? [
        {
          model: "investmentPlanDuration",
          method: "addDurations",
          data: durations.map((duration) => typeof duration === 'string' ? duration : duration.value),
          fields: {
            source: "planId",
            target: "durationId",
          },
        },
      ]
    : [];

  return await storeRecord({
    model: "investmentPlan",
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
      currency,
      walletType,
    },
    relations,
  });
};
