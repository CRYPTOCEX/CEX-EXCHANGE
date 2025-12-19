import { updateRecord } from "@b/utils/query";
import { MarketUpdateSchema } from "@b/api/admin/finance/exchange/market/utils";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Updates a specific ecosystem market",
  description:
    "Updates the metadata of an existing ecosystem market. This endpoint allows modification of market configuration including precision settings, trading limits, and fee structures.",
  operationId: "updateEcosystemMarket",
  tags: ["Admin", "Ecosystem", "Market"],
  logModule: "ADMIN_ECO",
  logTitle: "Update market",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecosystem market to update",
      required: true,
      schema: {
        type: "string",
        format: "uuid",
      },
    },
  ],
  requestBody: {
    description: "New metadata for the market",
    content: {
      "application/json": {
        schema: MarketUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Market updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Ecosystem Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ecosystem.market",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { metadata } = body;

  ctx?.step("Updating market record");
  const result = await updateRecord("ecosystemMarket", id, {
    metadata,
  });

  ctx?.success("Market updated successfully");
  return result;
};
