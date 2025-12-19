import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { forexPlanUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a Forex plan",
  description: "Updates an existing Forex plan by its ID. Can modify all plan settings including profit ranges, investment limits, currency, wallet type, and available durations.",
  operationId: "updateForexPlan",
  tags: ["Admin", "Forex", "Plan"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Update forex plan",
};

export default async (data) => {
  const { body, params , ctx } = data;
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

  ctx?.step("Validating data");

  ctx?.step(`Updating record ${id}`);

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

  const result = await updateRecord(
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

  ctx?.success("Record updated successfully");
  return result;
};
