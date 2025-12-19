// /api/admin/forex/plans/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { forexPlanStoreSchema, forexPlanUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Creates a new Forex plan",
  description: "Creates a new Forex trading plan with profit ranges, investment limits, currency, wallet type, and available durations.",
  operationId: "createForexPlan",
  tags: ["Admin", "Forex", "Plan"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Create forex plan",
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
    currency,
    walletType,
  } = body;

  ctx?.step("Validating forex plan data");

  const relations = durations
    ? [
        {
          model: "forexPlanDuration",
          method: "addDurations",
          data: durations.map((duration) => typeof duration === 'string' ? duration : duration.value),
          fields: {
            source: "planId",
            target: "durationId",
          },
        },
      ]
    : [];

  ctx?.step("Creating forex plan");
  const result = await storeRecord({
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

  ctx?.success("Forex plan created successfully");
  return result;
};
