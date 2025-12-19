import { models } from "@b/db";
import { getFiltered, serverErrorResponse, unauthorizedResponse } from "@b/utils/query";
import { crudParameters } from "@b/utils/constants";

export const metadata: OperationObject = {
  summary: "List gateway refunds",
  description: "Retrieves a paginated list of all gateway refunds with filtering and sorting capabilities. Includes merchant and payment information for each refund.",
  operationId: "listGatewayRefunds",
  tags: ["Admin", "Gateway", "Refund"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of refunds",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  description: "Refund with merchant and payment information",
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
  permission: "view.gateway.refund",
  demoMask: ["items.merchant.email"],
  logModule: "ADMIN_GATEWAY",
  logTitle: "List gateway refunds",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Fetching refunds list");

  const result = await getFiltered({
    model: models.gatewayRefund,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.gatewayMerchant,
        as: "merchant",
        attributes: ["id", "name", "email"],
      },
      {
        model: models.gatewayPayment,
        as: "payment",
        attributes: ["paymentIntentId", "merchantOrderId", "amount", "currency"],
      },
    ],
  });

  ctx?.success(`Retrieved ${result.items?.length || 0} refunds`);

  return result;
};
