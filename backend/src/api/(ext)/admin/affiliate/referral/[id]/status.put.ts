import { updateStatus, updateRecordResponses } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Updates the status of a specific affiliate referral",
  description:
    "Updates the status of a single affiliate referral. Valid statuses are PENDING, ACTIVE, and REJECTED. This affects the referral eligibility for rewards and commissions.",
  operationId: "updateAffiliateReferralStatus",
  tags: ["Admin", "Affiliate", "Referral"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the affiliate referral to update",
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
            status: {
              type: "string",
              enum: ["PENDING", "ACTIVE", "REJECTED"],
              description: "New status to apply to the affiliate referral",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Affiliate referral status updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Affiliate Referral"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.affiliate.referral",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Update affiliate referral status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Updating status for referral ID: ${id}`);
  const result = updateStatus("mlmReferral", id, status);

  ctx?.success("Referral status updated successfully");
  return result;
};
