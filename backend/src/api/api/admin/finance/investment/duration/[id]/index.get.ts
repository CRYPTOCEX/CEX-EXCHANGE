import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseInvestmentDurationSchema } from "../utils";

export const metadata = {
  summary:
    "Retrieves detailed information of a specific investment duration by ID",
  operationId: "getInvestmentDurationById",
  tags: ["Admin", "Investment Durations"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the investment duration to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Investment duration details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseInvestmentDurationSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Investment Duration"),
    500: serverErrorResponse,
  },
  permission: "view.investment.duration",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("investmentDuration", params.id);
};
