import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Lists all P2P payment methods with pagination and optional filtering",
  operationId: "listP2PPaymentMethods",
  tags: ["Admin", "P2P", "Payment Method"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of P2P payment methods",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("P2P Payment Methods"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.p2p.payment_method",
};

export default async (data: Handler) => {
  const { query, user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  return getFiltered({
    model: models.p2pPaymentMethod,
    query,
    sortField: query.sortField || "createdAt",
    where: {},
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email"],
        required: false,
      },
    ],
  });
};