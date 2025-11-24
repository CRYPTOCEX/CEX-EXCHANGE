import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { investmentPlanUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific Investment Plan",
  operationId: "updateInvestmentPlan",
  tags: ["Admin", "Investment Plans"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Investment Plan to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Investment Plan",
    content: {
      "application/json": {
        schema: investmentPlanUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Investment Plan"),
  requiresAuth: true,
  permission: "edit.investment.plan",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
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

  return await updateRecord(
    "investmentPlan",
    id,
    {
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
    undefined,
    relations
  );
};
