import { updateRecordResponses, updateStatus } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk updates affiliate referral status",
  description:
    "Updates the status of multiple affiliate referrals at once. Valid statuses are PENDING, ACTIVE, and REJECTED. This operation affects the referral eligibility for rewards and commissions.",
  operationId: "bulkUpdateAffiliateReferralStatus",
  tags: ["Admin", "Affiliate", "Referral"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of affiliate referral IDs to update",
              items: { type: "string", format: "uuid" },
            },
            status: {
              type: "string",
              enum: ["PENDING", "ACTIVE", "REJECTED"],
              description: "New status to apply to the affiliate referrals",
            },
          },
          required: ["ids", "status"],
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
  logTitle: "Bulk update affiliate referral status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Bulk updating status for ${ids.length} referrals`);
  const result = updateStatus("mlmReferral", ids, status);

  ctx?.success("Bulk status update completed successfully");
  return result;
};
