// /api/admin/forex/plans/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { forexPlanStoreSchema, forexPlanUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Forex Plan",
  operationId: "storeForexPlan",
  tags: ["Admin", "Forex Plans"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: forexPlanUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(forexPlanStoreSchema, "Forex Plan"),
  requiresAuth: true,
  permission: "create.forex.plan",
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
          model: "forexPlanDuration",
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
    model: "forexPlan",
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
