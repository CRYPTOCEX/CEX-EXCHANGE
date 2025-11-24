// /server/api/mlm/referrals/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes MLM Referrals by IDs",
  operationId: "bulkDeleteMlmReferrals",
  tags: ["Admin", "MLM", "Referrals"],
  parameters: commonBulkDeleteParams("MLM Referrals"),
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
              description: "Array of MLM Referral IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("MLM Referrals"),
  requiresAuth: true,
  permission: "delete.affiliate.referral",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "mlmReferral",
    ids,
    query,
  });
};
