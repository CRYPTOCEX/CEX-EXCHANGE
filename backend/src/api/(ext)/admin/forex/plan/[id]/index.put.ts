import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { forexPlanUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific Forex Plan",
  operationId: "updateForexPlan",
  tags: ["Admin", "Forex Plans"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the Forex Plan to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Forex Plan",
    content: {
      "application/json": {
        schema: forexPlanUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Forex Plan"),
  requiresAuth: true,
  permission: "edit.forex.plan",
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

  return await updateRecord(
    "forexPlan",
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
      profitPercentage,
      status,
      defaultProfit,
      defaultResult,
      trending,
      currency,
      walletType,
    },
    false,
    relations
  );
};
