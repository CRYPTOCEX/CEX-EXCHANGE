import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Staking Positions by IDs",
  operationId: "bulkDeleteStakingPositions",
  tags: ["Staking", "Admin", "Positions"],
  parameters: commonBulkDeleteParams("Staking Positions"),
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
              description: "Array of Staking Position IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Staking Positions"),
  requiresAuth: true,
  permission: "delete.staking.position",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "stakingPosition",
    ids,
    query,
  });
};
