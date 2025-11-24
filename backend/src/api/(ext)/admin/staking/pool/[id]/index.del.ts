import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deletes a specific Staking Pool",
  operationId: "deleteStakingPool",
  tags: ["Admin", "Staking", "Pools"],
  parameters: deleteRecordParams("Staking Pool"),
  responses: deleteRecordResponses("Staking Pool"),
  requiresAuth: true,
  permission: "delete.staking.pool",
};

export default async (data: Handler) => {
  const { params, query } = data;
  return handleSingleDelete({
    model: "stakingPool",
    id: params.id,
    query,
  });
};
