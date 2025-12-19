import { updateStatus } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk update affiliate reward claimed status",
  operationId: "bulkUpdateAffiliateRewardStatus",
  tags: ["Admin", "Affiliate", "Reward"],
  description:
    "Updates the claimed status for multiple affiliate rewards simultaneously. Use this to mark rewards as claimed or unclaimed in bulk.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of affiliate reward IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New claimed status to apply (true for claimed, false for unclaimed)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Affiliate reward claimed status updated successfully",
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
    404: notFoundResponse("Affiliate Reward"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.affiliate.reward",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Bulk update affiliate reward claimed status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;
  const isClaimed = status;

  ctx?.step(`Bulk updating claimed status for ${ids.length} rewards`);
  const result = updateStatus(
    "mlmReferralReward",
    ids,
    isClaimed,
    undefined,
    "Referral Reward"
  );

  ctx?.success("Bulk claimed status update completed successfully");
  return result;
};
