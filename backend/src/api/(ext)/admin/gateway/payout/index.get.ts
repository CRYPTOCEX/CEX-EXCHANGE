import { models } from "@b/db";
import { getFiltered, serverErrorResponse, unauthorizedResponse } from "@b/utils/query";
import { crudParameters } from "@b/utils/constants";

export const metadata: OperationObject = {
  summary: "List gateway payouts",
  description: "Retrieves a paginated list of all gateway merchant payouts with filtering and sorting capabilities. Includes merchant information for each payout. Returns both active and deleted records (paranoid: false).",
  operationId: "listGatewayPayouts",
  tags: ["Admin", "Gateway", "Payout"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of payouts",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  description: "Payout with merchant information",
                },
              },
              pagination: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  page: { type: "number" },
                  perPage: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.gateway.payout",
  demoMask: ["items.merchant.email"],
  logModule: "ADMIN_GATEWAY",
  logTitle: "List gateway payouts",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching payouts list");

  const result = await getFiltered({
    model: models.gatewayPayout,
    query,
    sortField: query.sortField || "createdAt",
    paranoid: false,
    includeModels: [
      {
        model: models.gatewayMerchant,
        as: "merchant",
        attributes: ["id", "name", "email"],
      },
    ],
  });

  ctx?.success(`Retrieved ${result.items?.length || 0} payouts`);

  return result;
};
