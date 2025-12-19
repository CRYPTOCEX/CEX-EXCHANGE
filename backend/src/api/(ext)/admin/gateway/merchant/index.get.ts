import { models } from "@b/db";
import { getFiltered, notFoundMetadataResponse, serverErrorResponse, unauthorizedResponse } from "@b/utils/query";
import { crudParameters } from "@b/utils/constants";

export const metadata: OperationObject = {
  summary: "List gateway merchants",
  description: "Retrieves a paginated list of all gateway merchant accounts with filtering and sorting capabilities. Includes user information for each merchant.",
  operationId: "listGatewayMerchants",
  tags: ["Admin", "Gateway", "Merchant"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of merchants",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  description: "Gateway merchant with associated user information",
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
  permission: "view.gateway.merchant",
  demoMask: ["items.user.email", "items.email", "items.phone"],
  logModule: "ADMIN_GATEWAY",
  logTitle: "List gateway merchants",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching merchants list");

  const result = await getFiltered({
    model: models.gatewayMerchant,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });

  ctx?.success(`Retrieved ${result.items?.length || 0} merchants`);

  return result;
};
