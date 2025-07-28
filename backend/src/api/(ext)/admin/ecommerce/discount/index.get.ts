// /server/api/ecommerce/discounts/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecommerceDiscountSchema } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all ecommerce discounts with pagination and optional filtering",
  operationId: "listEcommerceDiscounts",
  tags: ["Admin", "Ecommerce", "Discounts"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecommerce discounts with product details and pagination",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecommerceDiscountSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("E-commerce Discounts"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecommerce.discount",
};

export default async (data: Handler) => {
  const { query } = data;

  return getFiltered({
    model: models.ecommerceDiscount,
    query,
    sortField: query.sortField || "validUntil",
    numericFields: ["percentage"],
    includeModels: [
      {
        model: models.ecommerceProduct,
        as: "product",
        attributes: ["id", "image", "name"],
        includeModels: [
          {
            model: models.ecommerceCategory,
            as: "category",
            attributes: ["name"],
          },
        ],
      },
    ],
  });
};
