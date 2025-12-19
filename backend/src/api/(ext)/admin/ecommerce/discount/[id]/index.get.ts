import { getRecord } from "@b/utils/query";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";
import { baseEcommerceDiscountSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a specific ecommerce discount by ID",
  operationId: "getEcommerceDiscountById",
  description:
    "Fetches detailed information about a specific ecommerce discount including its code, percentage, validity date, status, and associated product details with category information. Use this endpoint to view or edit a single discount record.",
  tags: ["Admin", "Ecommerce", "Discount"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecommerce discount to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ecommerce discount details with product information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcommerceDiscountSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Ecommerce Discount"),
    500: serverErrorResponse,
  },
  permission: "view.ecommerce.discount",
  requiresAuth: true,
  logModule: "ADMIN_ECOM",
  logTitle: "Get discount details",
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step("Validating discount ID");
  ctx?.step(`Fetching discount: ${params.id}`);

  const result = await getRecord("ecommerceDiscount", params.id, [
    {
      model: models.ecommerceProduct,
      as: "product",
      attributes: ["image", "name"],
      includeModels: [
        {
          model: models.ecommerceCategory,
          as: "category",
          attributes: ["name"],
        },
      ],
    },
  ]);

  ctx?.success("Discount details retrieved successfully");
  return result;
};
