import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcommerceWishlistSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific ecommerce wishlist item by ID",
  operationId: "getEcommerceWishlistById",
  tags: ["Admin", "Ecommerce Wishlist"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecommerce wishlist item to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ecommerce wishlist item details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcommerceWishlistSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecommerce Wishlist"),
    500: serverErrorResponse,
  },
  permission: "view.ecommerce.wishlist",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("ecommerceWishlist", params.id, [
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
  ]);
};
