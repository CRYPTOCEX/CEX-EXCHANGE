// /server/api/ecommerce/wishlists/index.get.ts

import { models } from "@b/db";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecommerceWishlistSchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all ecommerce wishlist entries with pagination and optional filtering",
  operationId: "listEcommerceWishlists",
  tags: ["Admin", "Ecommerce", "Wishlists"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecommerce wishlist entries with details about the product and the user",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecommerceWishlistSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("E-commerce Wishlists"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecommerce.wishlist",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.ecommerceWishlist,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.ecommerceProduct,
        as: "products",
        through: {
          model: models.ecommerceWishlistItem,
          attributes: [],
        },
        attributes: ["name", "price", "status"],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
};
