// /server/api/ecommerce/discounts/index.get.ts

import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import { getFiltered } from "@b/utils/query";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";
import { ecommerceDiscountSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Lists all ecommerce discounts with pagination and filtering",
  operationId: "listEcommerceDiscounts",
  description:
    "Retrieves a paginated list of all ecommerce discounts with their associated product information. Supports filtering, sorting, and searching capabilities. Returns discount codes, percentages, validity dates, and linked product details including category information.",
  tags: ["Admin", "Ecommerce", "Discount"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecommerce discounts with product details and pagination metadata",
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
    404: notFoundResponse("Ecommerce Discounts"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecommerce.discount",
  logModule: "ADMIN_ECOM",
  logTitle: "List discounts",
};

export default async (data: Handler) => {
  const { query, ctx } = data;

  ctx?.step("Parsing query parameters");
  ctx?.step("Fetching discounts from database");

  const result = await getFiltered({
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

  ctx?.success(`Retrieved ${result.items?.length || 0} discounts`);
  return result;
};
