import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcommerceDiscountSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific ecommerce discount by ID",
  operationId: "getEcommerceDiscountById",
  tags: ["Admin", "Ecommerce Discounts"],
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
      description: "Ecommerce discount details",
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
    404: notFoundMetadataResponse("Ecommerce Discount"),
    500: serverErrorResponse,
  },
  permission: "view.ecommerce.discount",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("ecommerceDiscount", params.id, [
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
};
