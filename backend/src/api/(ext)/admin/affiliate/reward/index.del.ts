// /server/api/mlm/referral-rewards/delete.del.ts

import {
  commonBulkDeleteParams,
  handleBulkDelete,
} from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk delete affiliate rewards",
  operationId: "bulkDeleteAffiliateRewards",
  tags: ["Admin", "Affiliate", "Reward"],
  description:
    "Deletes multiple affiliate referral rewards by their IDs. This operation permanently removes the rewards from the system.",
  parameters: commonBulkDeleteParams("Affiliate Rewards"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of affiliate reward IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Affiliate rewards deleted successfully",
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
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "delete.affiliate.reward",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Bulk delete affiliate rewards",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Bulk deleting ${ids.length} rewards`);
  const result = handleBulkDelete({
    model: "mlmReferralReward",
    ids,
    query,
  });

  ctx?.success("Bulk delete completed successfully");
  return result;
};
