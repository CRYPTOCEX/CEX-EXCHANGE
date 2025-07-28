import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Create a New Launch Plan",
  description: "Creates a new launch plan configuration for ICO admin.",
  operationId: "createLaunchPlan",
  tags: ["ICO", "Admin", "LaunchPlans"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "The plan name." },
            description: { type: "string", description: "Plan description." },
            price: { type: "number", description: "Plan price." },
            currency: {
              type: "string",
              description: "Currency code (e.g., USD).",
            },
            walletType: {
              type: "string",
              description: "Wallet type for the plan.",
            },
            features: {
              type: "object",
              description: "Plan features in JSON format.",
            },
            recommended: {
              type: "boolean",
              description: "If this plan is recommended.",
            },
            status: {
              type: "boolean",
              description: "Plan status. Defaults to true if not provided.",
            },
            sortOrder: {
              type: "number",
              description: "Sort order of the plan.",
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
      description: "Launch plan created successfully.",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              launchPlan: { type: "object" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized – Admin privileges required." },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
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
  if (
    !name ||
    !description ||
    price === undefined ||
    !currency ||
    !walletType ||
    !features
  ) {
    throw createError({
      statusCode: 400,
      message:
        "Missing required fields: name, description, price, currency, walletType, features",
    });
  }
  const statusFlag = status === undefined ? true : status;
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
  return {
    message: "Launch plan created successfully.",
  };
};
