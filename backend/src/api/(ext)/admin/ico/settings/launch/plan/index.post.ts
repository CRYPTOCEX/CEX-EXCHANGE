import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Create ICO Launch Plan",
  description:
    "Creates a new ICO launch plan with pricing and feature configuration. Launch plans define what features and limits token offering creators get based on their subscription tier.",
  operationId: "createIcoLaunchPlan",
  tags: ["Admin", "ICO", "Settings"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "The plan name" },
            description: { type: "string", description: "Plan description" },
            price: { type: "number", description: "Plan price" },
            currency: {
              type: "string",
              description: "Currency code (e.g., USD)",
            },
            walletType: {
              type: "string",
              description: "Wallet type for the plan",
            },
            features: {
              type: "object",
              description: "Plan features in JSON format",
            },
            recommended: {
              type: "boolean",
              description: "If this plan is recommended",
            },
            status: {
              type: "boolean",
              description: "Plan status. Defaults to true if not provided",
            },
            sortOrder: {
              type: "number",
              description: "Sort order of the plan",
            },
          },
          required: [
            "name",
            "description",
            "price",
            "currency",
            "walletType",
            "features",
          ],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Launch plan created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "edit.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Create launch plan",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  ctx?.step("Validating user permissions");
  if (!user?.id) {
    ctx?.fail("Unauthorized access");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const {
    name,
    description,
    price,
    currency,
    walletType,
    features,
    recommended,
    status,
    sortOrder,
  } = body;

  ctx?.step("Validating launch plan data");
  if (
    !name ||
    !description ||
    price === undefined ||
    !currency ||
    !walletType ||
    !features
  ) {
    ctx?.fail("Missing required fields");
    throw createError({
      statusCode: 400,
      message:
        "Missing required fields: name, description, price, currency, walletType, features",
    });
  }

  const statusFlag = status === undefined ? true : status;

  ctx?.step("Creating launch plan");
  await models.icoLaunchPlan.create({
    name,
    description,
    price,
    currency,
    walletType,
    features,
    recommended: recommended || false,
    status: statusFlag,
    sortOrder: sortOrder || 0,
  });

  ctx?.success("Launch plan created successfully");
  return {
    message: "Launch plan created successfully.",
  };
};
