import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { aiInvestmentPlanUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific AI Investment Plan",
  operationId: "updateAiInvestmentPlan",
  tags: ["Admin", "AI Investment Plans"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the AI Investment Plan to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the AI Investment Plan",
    content: {
      "application/json": {
        schema: aiInvestmentPlanUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("AI Investment Plan"),
  requiresAuth: true,
  permission: "edit.ai.investment.plan",
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

  return await updateRecord(
    "aiInvestmentPlan",
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
    },
    undefined,
    relations
  );
};
