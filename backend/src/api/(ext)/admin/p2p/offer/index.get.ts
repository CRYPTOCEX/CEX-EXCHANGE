// backend/src/api/admin/p2p/offers/index.get.ts

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
  summary: "List all P2P offers",
  operationId: "listAdminP2POffers",
  tags: ["Admin", "P2P", "Offer"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Retrieves a paginated list of all P2P offers with detailed information including user details, payment methods, and offer status. Supports filtering, sorting, and pagination.",
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
    404: notFoundMetadataResponse("p2p Offers"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_P2P",
  logTitle: "Get P2P Offers",
  permission: "view.p2p.offer",
  demoMask: ["items.user.email"],
};

export default async (data: Handler) => {
  const { query, user, ctx } = data;
  
  ctx?.step("Fetching data");
    if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const result = await getFiltered({
    model: models.p2pOffer,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.p2pPaymentMethod,
        as: "paymentMethods",
        attributes: ["id", "name", "icon"],
        through: { attributes: [] },
      },
    ],
  });

  // Extract priceCurrency from priceConfig for each offer
  if (result.items && Array.isArray(result.items)) {
    result.items = result.items.map((offer: any) => {
      const plain = offer.get ? offer.get({ plain: true }) : offer;
      if (!plain.priceCurrency && plain.priceConfig) {
        plain.priceCurrency = plain.priceConfig.currency || "USD";
      }
      return plain;
    });
  }

  ctx?.success("P2P offers retrieved successfully");
  return result;
};
