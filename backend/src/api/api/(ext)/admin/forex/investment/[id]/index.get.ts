import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseForexInvestmentSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific forex investment by ID",
  operationId: "getForexInvestmentById",
  tags: ["Admin", "Forex Investments"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the forex investment to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Forex investment details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseForexInvestmentSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Investment"),
    500: serverErrorResponse,
  },
  permission: "view.forex.investment",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("forexInvestment", params.id, [
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
    {
      model: models.forexPlan,
      as: "plan",
      attributes: ["id", "title"],
    },
    {
      model: models.forexDuration,
      as: "duration",
      attributes: ["id", "duration", "timeframe"],
    },
  ]);
};
