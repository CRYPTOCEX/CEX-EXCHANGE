import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of affiliate conditions",
  description:
    "Updates the active status of multiple affiliate conditions simultaneously. Accepts an array of condition IDs and a boolean status value. This is useful for enabling or disabling multiple conditions at once without individual updates.",
  operationId: "bulkUpdateAffiliateConditionStatus",
  tags: ["Admin", "Affiliate", "Condition"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of affiliate condition IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Affiliate Condition"),
  requiresAuth: true,
  permission: "edit.affiliate.condition",
  logModule: "ADMIN_AFFILIATE",
  logTitle: "Bulk update affiliate condition status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Bulk updating status for ${ids.length} conditions`);
  const result = updateStatus("mlmReferralCondition", ids, status);

  ctx?.success("Bulk status update completed successfully");
  return result;
};
