import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters } from "@b/utils/constants";
import { literal } from "sequelize";

export const metadata = {
  summary:
    "Lists Staking Pools with associated positions, admin earnings, and performances",
  operationId: "listStakingPools",
  tags: ["Staking", "Admin", "Pools"],
  parameters: crudParameters,
  responses: {
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Staking Pools"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.staking.pool",
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user) {
    throw new Error("Unauthorized");
  }

  return getFiltered({
    model: models.stakingPool,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.stakingPosition,
        as: "positions",
        required: false,
      },
      {
        model: models.stakingAdminEarning,
        as: "adminEarnings",
        required: false,
      },
      {
        model: models.stakingExternalPoolPerformance,
        as: "performances",
        required: false,
      },
    ],
    compute: [
      // Compute totalStaked as the sum of all positions' amounts for this pool
      [
        literal(`(
          SELECT COALESCE(SUM(sp.amount), 0)
          FROM staking_positions AS sp
          WHERE sp.poolId = stakingPool.id
        )`),
        "totalStaked",
      ],
    ],
  });
};
