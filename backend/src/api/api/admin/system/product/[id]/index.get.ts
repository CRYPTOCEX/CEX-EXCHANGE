import { getProduct } from "@b/api/admin/system/utils";

export const metadata = {
  summary: "Retrieves details of a specific product by name",
  operationId: "getProductDetails",
  tags: ["Admin", "System"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Id of the product to retrieve",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description: "Product details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "ID of the product",
              },
              name: {
                type: "string",
                description: "Name of the product",
              },
              title: {
                type: "string",
                description: "Title of the product",
              },
              description: {
                type: "string",
                description: "Description of the product",
              },
              version: {
                type: "string",
                description: "Version of the product",
              },
              image: {
                type: "string",
                description: "Image of the product",
              },
              status: {
                type: "boolean",
                description: "Status of the product",
              },
            },
          },
        },
      },
    },
    401: {
      description: "Unauthorized, admin permission required",
    },
    404: {
      description: "Product not found",
    },
    500: {
      description: "Internal server error",
    },
  },
  // requiresAuth: true,
};

export default async (data) => {
  const { params } = data;
  return getProduct(params.id);
};
