// /server/api/mlm/referral-rewards/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes MLM Referral Rewards by IDs",
  operationId: "bulkDeleteMlmReferralRewards",
  tags: ["Admin", "MLM", "Referral Rewards"],
  parameters: commonBulkDeleteParams("MLM Referral Rewards"),
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
              description: "Array of MLM Referral Reward IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("MLM Referral Rewards"),
  requiresAuth: true,
  permission: "delete.affiliate.reward",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "mlmReferralReward",
    ids,
    query,
  });
};
