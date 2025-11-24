import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcommerceReviewSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific ecommerce review by ID",
  operationId: "getEcommerceReviewById",
  tags: ["Admin", "Ecommerce Reviews"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecommerce review to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ecommerce review details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcommerceReviewSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Review"),
    500: serverErrorResponse,
  },
  permission: "view.ecommerce.review",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("ecommerceReview", params.id, [
    {
      model: models.ecommerceProduct,
      as: "product",
      attributes: ["id", "name", "price", "status", "image"],
      includeModels: [
        {
          model: models.ecommerceCategory,
          as: "category",
          attributes: ["name"],
        },
      ],
    },
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
  ]);
};
