import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Staking Pools by IDs",
  operationId: "bulkDeleteStakingPools",
  tags: ["Admin", "Staking", "Pools"],
  parameters: commonBulkDeleteParams("Staking Pools"),
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
              description: "Array of Staking Pool IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Staking Pools"),
  requiresAuth: true,
  permission: "edit.staking.pool",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "stakingPool",
    ids,
    query,
  });
};
