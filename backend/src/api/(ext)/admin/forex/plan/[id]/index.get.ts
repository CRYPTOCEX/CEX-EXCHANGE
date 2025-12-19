import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseForexPlanSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Gets a specific Forex plan",
  description: "Retrieves detailed information about a specific Forex plan by its ID, including all profit settings, limits, and available durations.",
  operationId: "getForexPlan",
  tags: ["Admin", "Forex", "Plan"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex plan to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Forex plan details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseForexPlanSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Plan"),
    500: serverErrorResponse,
  },
  permission: "view.forex.plan",
  requiresAuth: true,
  logModule: "ADMIN_FOREX",
  logTitle: "Get Forex Plan",
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step("Fetching forex plan record");
  const result = await getRecord("forexPlan", params.id, [
    {
      model: models.forexDuration,
      as: "durations",
      through: { attributes: [] },
      attributes: ["id", "duration", "timeframe"],
    },
  ]);

  ctx?.success("Retrieved forex plan");
  return result;
};
