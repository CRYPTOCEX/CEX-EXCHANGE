// /server/api/mlm/referrals/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk deletes affiliate referrals by IDs",
  description:
    "Deletes multiple affiliate referral records at once. This operation permanently removes the referral relationships and associated MLM nodes (binary/unilevel) for the specified referral IDs.",
  operationId: "bulkDeleteAffiliateReferrals",
  tags: ["Admin", "Affiliate", "Referral"],
  parameters: commonBulkDeleteParams("Affiliate Referrals"),
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description:
                "Array of affiliate referral IDs (UUIDs) to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Affiliate referrals deleted successfully",
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
  permission: "delete.affiliate.referral",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Bulk delete affiliate referrals",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Bulk deleting ${ids.length} referrals`);
  const result = handleBulkDelete({
    model: "mlmReferral",
    ids,
    query,
  });

  ctx?.success("Bulk delete completed successfully");
  return result;
};
