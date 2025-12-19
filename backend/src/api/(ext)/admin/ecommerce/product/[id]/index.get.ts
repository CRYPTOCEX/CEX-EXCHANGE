import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcommerceProductSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a specific ecommerce product by ID",
  operationId: "getEcommerceProductById",
  tags: ["Admin", "Ecommerce", "Product"],
  description: "Fetches detailed information for a single ecommerce product including associated category details and customer reviews.",
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
      description: "Ecommerce product retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcommerceProductSchema,
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
  const { params, ctx } = data;

  ctx?.step("Fetching product by ID");

  const result = await getRecord("ecommerceProduct", params.id, [
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

  ctx?.success("Product retrieved successfully");
  return result;
};
