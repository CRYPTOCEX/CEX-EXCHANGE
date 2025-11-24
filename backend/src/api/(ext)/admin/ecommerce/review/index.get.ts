// /server/api/ecommerce/reviews/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecommerceReviewSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all ecommerce reviews with pagination and optional filtering",
  operationId: "listEcommerceReviews",
  tags: ["Admin", "Ecommerce", "Reviews"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecommerce reviews with details about the product and the user",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecommerceReviewSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("E-commerce Reviews"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecommerce.review",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.ecommerceReview,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.ecommerceProduct,
        as: "product",
        attributes: ["id", "name", "price", "status", "image"],
        includeModels: [
          {
            model: models.ecommerceCategory,
            as: "category",
            attributes: ["id", "name"],
          },
        ],
      },
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
    numericFields: ["rating"],
  });
};
