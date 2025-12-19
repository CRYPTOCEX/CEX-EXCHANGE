import {
  getRecord,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { notFoundResponse } from "@b/utils/schema/errors";
import { baseEcosystemTokenSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves an ecosystem token by ID",
  description:
    "Fetches detailed information about a specific ecosystem token including its contract address, chain, decimals, limits, fees, and other metadata.",
  operationId: "getEcosystemTokenById",
  tags: ["Admin", "Ecosystem", "Token"],
  logModule: "ADMIN_ECO",
  logTitle: "Get token details",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecosystem token to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ecosystem token retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcosystemTokenSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Ecosystem Token"),
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.token",
  requiresAuth: true,
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step("Retrieving token details");
  const token = await getRecord("ecosystemToken", params.id);

  ctx?.success("Token details retrieved");
  return token;
};
