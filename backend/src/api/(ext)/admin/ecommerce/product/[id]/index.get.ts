import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcommerceProductSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific ecommerce product by ID",
  operationId: "getEcommerceProductById",
  tags: ["Admin", "Ecommerce Products"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecommerce product to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ecommerce product details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcommerceProductSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Product"),
    500: serverErrorResponse,
  },
  permission: "view.ecommerce.product",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("ecommerceProduct", params.id, [
    {
      model: models.ecommerceCategory,
      as: "category",
      attributes: ["name"],
    },
    {
      model: models.ecommerceReview,
      as: "ecommerceReviews",
      attributes: ["rating", "comment"],
      required: false,
    },
  ]);
};
