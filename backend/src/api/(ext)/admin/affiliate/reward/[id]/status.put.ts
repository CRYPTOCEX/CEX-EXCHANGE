import { updateStatus } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Update affiliate reward claimed status",
  operationId: "updateAffiliateRewardStatus",
  tags: ["Admin", "Affiliate", "Reward"],
  description:
    "Updates the claimed status for a specific affiliate referral reward. Use this to mark a reward as claimed or unclaimed.",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the affiliate reward to update",
      schema: { type: "string" },
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
              type: "boolean",
              description:
                "New claimed status to apply (true for claimed, false for unclaimed)",
            },
          },
          required: ["status"],
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
  logTitle: "Update affiliate reward claimed status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;
  const isClaimed = status;

  ctx?.step(`Updating claimed status for reward ID: ${id}`);
  const result = updateStatus(
    "mlmReferralReward",
    id,
    isClaimed,
    undefined,
    "Referral Reward"
  );

  ctx?.success("Reward claimed status updated successfully");
  return result;
};
