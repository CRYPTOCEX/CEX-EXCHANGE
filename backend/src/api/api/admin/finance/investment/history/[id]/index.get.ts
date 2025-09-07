import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseInvestmentSchema } from "../utils";
import { models } from "@b/db";

export const metadata = {
  summary: "Retrieves detailed information of a specific Investment by ID",
  operationId: "getInvestmentById",
  tags: ["Admin", "Investments"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the Investment to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "investment details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseInvestmentSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Investment"),
    500: serverErrorResponse,
  },
  permission: "view.investment",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("investment", params.id, [
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
    {
      model: models.investmentPlan,
      as: "plan",
      attributes: ["id", "title"],
    },
    {
      model: models.investmentDuration,
      as: "duration",
      attributes: ["id", "duration", "timeframe"],
    },
  ]);
};
