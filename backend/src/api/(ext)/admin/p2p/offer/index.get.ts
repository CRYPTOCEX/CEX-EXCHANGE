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
  summary: "Lists all p2p offers with pagination and optional filtering",
  operationId: "listP2POffers",
  tags: ["Admin", "P2P", "Offers"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Paginated list of p2p offers with detailed information",
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
    404: notFoundMetadataResponse("p2p Offers"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.p2p.offer",
};

export default async (data: Handler) => {
  const { query, user } = data;
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

  return result;
};
