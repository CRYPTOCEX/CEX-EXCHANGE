import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { createError } from "@b/utils/error";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update ICO Launch Plan",
  description:
    "Updates an existing ICO launch plan configuration including pricing, features, and display settings.",
  operationId: "updateIcoLaunchPlan",
  tags: ["Admin", "ICO", "Settings"],
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
  responses: {
    200: {
      description: "Launch plan updated successfully",
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
    404: notFoundResponse("Launch Plan"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ico.settings",
  logModule: "ADMIN_ICO",
  logTitle: "Update launch plan",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
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

  ctx?.step("Updating launch plan");
  const result = await updateRecord("icoLaunchPlan", id, {
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

  ctx?.success("Launch plan updated successfully");
  return result;
};
