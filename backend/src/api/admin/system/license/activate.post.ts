import { activateLicense } from "@b/api/admin/system/utils";

export const metadata = {
  summary: "Activates the license for a product",
  operationId: "activateProductLicense",
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
              description: "Product ID whose license to activate",
            },
            purchaseCode: {
              type: "string",
              description: "Purchase code for the product",
            },
            envatoUsername: {
              type: "string",
              description: "Envato username of the purchaser",
            },
          },
          required: ["productId", "purchaseCode", "envatoUsername"],
        },
      },
    },
  },
  permission: "create.license",
  responses: {
    200: {
      description: "License activated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description:
                  "Confirmation message indicating successful activation",
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
  logModule: "ADMIN_SYS",
  logTitle: "Activate license",
};

export default async (data) => {
  const { ctx } = data;

  ctx?.step("Validating license details");
  ctx?.step("Activating license with Envato");

  const result = await activateLicense(
    data.body.productId,
    data.body.purchaseCode,
    data.body.envatoUsername
  );

  ctx?.success("License activated successfully");
  return result;
};
