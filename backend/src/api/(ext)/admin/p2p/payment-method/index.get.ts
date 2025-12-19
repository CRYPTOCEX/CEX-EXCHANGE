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
              items: {
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
  logModule: "ADMIN_P2P",
  logTitle: "Get P2P Payment Methods",
  permission: "view.p2p.payment_method",
  demoMask: ["items.user.email"],
};

export default async (data: Handler) => {
  const { query, user, ctx } = data;
  
  ctx?.step("Fetching data");
    if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

    ctx?.success("Operation completed successfully");
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