import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseForexInvestmentSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Gets a specific Forex investment",
  description: "Retrieves detailed information about a specific Forex investment by its ID, including associated user, plan, and duration details.",
  operationId: "getForexInvestment",
  tags: ["Admin", "Forex", "Investment"],
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
  logModule: "ADMIN_FOREX",
  logTitle: "Get Forex Investment",
  demoMask: ["user.email"],
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step("Fetching forex investment record");
  const result = await getRecord("forexInvestment", params.id, [
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

  ctx?.success("Retrieved forex investment");
  return result;
};
