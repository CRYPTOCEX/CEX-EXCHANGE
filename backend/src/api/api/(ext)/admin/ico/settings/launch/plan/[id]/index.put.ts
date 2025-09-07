import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update a specific Launch Plan",
  description: "Updates a launch plan configuration for ICO admin.",
  operationId: "updateLaunchPlan",
  tags: ["ICO", "Admin", "LaunchPlans"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the launch plan to update",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "New data for the launch plan configuration",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Plan name" },
            description: { type: "string", description: "Plan description" },
            price: { type: "number", description: "Plan price" },
            currency: { type: "string", description: "Currency code" },
            walletType: { type: "string", description: "Wallet type" },
            features: { type: "object", description: "Plan features" },
            recommended: { type: "boolean", description: "Is recommended" },
            status: { type: "boolean", description: "Plan status" },
            sortOrder: { type: "number", description: "Sort order" },
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
  responses: updateRecordResponses("Launch Plan"),
  requiresAuth: true,
  permission: "edit.ico.settings",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
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
  return await updateRecord("icoLaunchPlan", id, {
    name,
    description,
    price,
    currency,
    walletType,
    features,
    recommended: recommended || false,
    status: status === undefined ? true : status,
    sortOrder: sortOrder || 0,
  });
};
