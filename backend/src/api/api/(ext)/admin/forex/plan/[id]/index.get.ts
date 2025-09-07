import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseForexPlanSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific forex plan by ID",
  operationId: "getForexPlanById",
  tags: ["Admin", "Forex Plans"],
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
};

export default async (data) => {
  const { params } = data;

  return await getRecord("forexPlan", params.id, [
    {
      model: models.forexDuration,
      as: "durations",
      through: { attributes: [] },
      attributes: ["id", "duration", "timeframe"],
    },
  ]);
};
