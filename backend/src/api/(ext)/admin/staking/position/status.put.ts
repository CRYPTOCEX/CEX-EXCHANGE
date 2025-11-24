import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of Staking Positions",
  operationId: "bulkUpdateStakingPositionStatus",
  tags: ["Staking", "Admin", "Positions"],
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
              description: "Array of Staking Position IDs to update",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL"],
              description: "New status to apply to the Staking Positions",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Staking Position"),
  requiresAuth: true,
  permission: "edit.staking.position",
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("stakingPosition", ids, status);
};
