import { checkLatestVersion } from "@b/api/admin/system/utils";

export const metadata = {
  summary: "Checks for the latest version of a product",
  operationId: "checkLatestProductVersion",
  tags: ["Admin", "System"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            productId: {
              type: "string",
              description: "Product ID to check",
            },
          },
          required: ["productId"],
        },
      },
    },
  },
  permission: "create.license",
  responses: {
    200: {
      description: "Latest version fetched successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              latestVersion: {
                type: "string",
                description: "Latest version of the product",
              },
            },
          },
        },
      },
    },
    401: {
      description: "Unauthorized, admin permission required",
    },
    500: {
      description: "Internal server error",
    },
  },
  requiresAuth: true,
};

export default async (data) => {
  return checkLatestVersion(data.body.productId);
};
