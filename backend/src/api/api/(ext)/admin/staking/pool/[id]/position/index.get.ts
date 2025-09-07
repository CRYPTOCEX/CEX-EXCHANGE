// backend/src/api/(ext)/admin/staking/position/index.get.ts

import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters } from "@b/utils/constants";
import { literal } from "sequelize";

export const metadata: OperationObject = {
  summary: "Lists Staking Positions with computed rewards and earning details",
  operationId: "listStakingPositions",
  tags: ["Staking", "Admin", "Positions"],
  parameters: [
    ...crudParameters,
    {
      index: crudParameters.length,
      name: "poolId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter positions by pool ID",
    },
    {
      index: crudParameters.length + 1,
      name: "status",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: ["ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL"],
      },
      description: "Filter positions by status",
    },
  ],
  responses: {
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Staking Positions"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.staking.position",
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user) {
    throw new Error("Unauthorized");
  }

  return getFiltered({
    model: models.stakingPosition,
    query,
    sortField: query.sortField || "createdAt",
    includeModels: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "email", "firstName", "lastName", "avatar"],
      },
      {
        model: models.stakingPool,
        as: "pool",
        attributes: ["id", "name", "symbol", "apr"],
      },
      {
        model: models.stakingEarningRecord,
        as: "earningHistory",
        required: false,
      },
    ],
    compute: [
      [
        literal(`(
          SELECT COALESCE(SUM(ser.amount), 0)
          FROM staking_earning_records AS ser
          WHERE ser.positionId = stakingPosition.id
            AND ser.isClaimed = false
        )`),
        "pendingRewards",
      ],
      [
        literal(`(
          SELECT COALESCE(SUM(ser.amount), 0)
          FROM staking_earning_records AS ser
          WHERE ser.positionId = stakingPosition.id
        )`),
        "earningsToDate",
      ],
      [
        literal(`(
          SELECT MAX(ser.createdAt)
          FROM staking_earning_records AS ser
          WHERE ser.positionId = stakingPosition.id
        )`),
        "lastEarningDate",
      ],
    ],
  });
};
