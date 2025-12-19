import { models } from "@b/db";
import { getFiltered, serverErrorResponse, unauthorizedResponse } from "@b/utils/query";
import { crudParameters } from "@b/utils/constants";

export const metadata: OperationObject = {
  summary: "List gateway payments",
  description: "Retrieves a paginated list of all gateway payments with filtering and sorting capabilities. Supports filtering by mode (LIVE/TEST) and includes merchant and customer information for each payment.",
  operationId: "listGatewayPayments",
  tags: ["Admin", "Gateway", "Payment"],
  parameters: [
    ...crudParameters,
    {
      name: "mode",
      in: "query",
      description: "Filter by mode (LIVE or TEST)",
      schema: {
        type: "string",
        enum: ["LIVE", "TEST"],
      },
    },
  ],
  responses: {
    200: {
      description: "Paginated list of payments",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  description: "Payment with merchant and customer information",
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
  permission: "view.gateway.payment",
  demoMask: ["items.customer.email", "items.merchant.email"],
  logModule: "ADMIN_GATEWAY",
  logTitle: "List gateway payments",
};

export default async (data: Handler) => {
  const { query, ctx } = data;
  const mode = query?.mode as "LIVE" | "TEST" | undefined;

  ctx?.step(`Fetching payments list${mode ? ` (mode: ${mode})` : ""}`);

  // Build where clause with mode filter
  const where: any = {};
  if (mode) {
    where.testMode = mode === "TEST";
  }

  const result = await getFiltered({
    model: models.gatewayPayment,
    query,
    where,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.gatewayMerchant,
        as: "merchant",
        attributes: ["id", "name", "slug", "email"],
      },
      {
        model: models.user,
        as: "customer",
        attributes: ["id", "firstName", "lastName", "email"],
      },
    ],
  });

  ctx?.success(`Retrieved ${result.items?.length || 0} payments`);

  return result;
};
