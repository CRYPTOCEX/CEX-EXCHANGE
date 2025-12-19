import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { updateRecord, updateRecordResponses } from "@b/utils/query";
import {
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Update gateway merchant",
  description: "Updates gateway merchant details including business information, fee structure, payment limits, payout settings, and allowed currencies/wallet types.",
  operationId: "updateGatewayMerchant",
  tags: ["Admin", "Gateway", "Merchant"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Merchant UUID",
      schema: { type: "string", format: "uuid" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Business name" },
            email: { type: "string", format: "email", description: "Contact email" },
            website: { type: "string", format: "uri", description: "Business website URL" },
            description: { type: "string", description: "Business description" },
            logo: { type: "string", description: "Logo URL" },
            phone: { type: "string", description: "Contact phone number" },
            address: { type: "string", description: "Business address" },
            country: { type: "string", description: "Country code" },
            testMode: { type: "boolean", description: "Enable/disable test mode" },
            feeType: { type: "string", enum: ["PERCENTAGE", "FIXED", "BOTH"], description: "Fee type" },
            feePercentage: { type: "number", description: "Fee percentage (e.g., 2.9 for 2.9%)" },
            feeFixed: { type: "number", description: "Fixed fee amount" },
            payoutSchedule: { type: "string", enum: ["INSTANT", "DAILY", "WEEKLY", "MONTHLY"], description: "Payout schedule" },
            payoutThreshold: { type: "number", description: "Minimum payout threshold" },
            dailyLimit: { type: "number", description: "Daily transaction limit" },
            monthlyLimit: { type: "number", description: "Monthly transaction limit" },
            transactionLimit: { type: "number", description: "Per-transaction limit" },
            allowedCurrencies: { type: "array", items: { type: "string" }, description: "Allowed currency codes" },
            allowedWalletTypes: { type: "array", items: { type: "string", enum: ["FIAT", "SPOT", "ECO"] }, description: "Allowed wallet types" },
            defaultCurrency: { type: "string", description: "Default currency code" },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Merchant updated successfully",
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
    404: notFoundResponse("Merchant"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.gateway.merchant",
  logModule: "ADMIN_GATEWAY",
  logTitle: "Update merchant details",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;
  const { id } = params;

  ctx?.step(`Updating merchant ${id}`);

  const result = await updateRecord("gatewayMerchant", id, body);

  ctx?.success(`Merchant ${id} updated successfully`);

  return result;
};
