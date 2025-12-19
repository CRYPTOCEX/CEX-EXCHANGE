// Admin get leader details
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Copy Trading Leader Details (Admin)",
  description: "Retrieves detailed information about a leader.",
  operationId: "adminGetCopyTradingLeader",
  tags: ["Admin", "Copy Trading"],
  requiresAuth: true,
  logModule: "ADMIN_COPY",
  logTitle: "Get Copy Trading Leader",
  permission: "access.copy_trading",
  demoMask: ["user.email", "followers.user.email"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Leader details retrieved successfully" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Leader not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { params, ctx } = data;
  const { id } = params;

  ctx?.step("Get Copy Trading Leader");

  const leader = await models.copyTradingLeader.findByPk(id, {
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar", "createdAt"],
      },
    ],
    paranoid: false, // Include soft-deleted
  });

  if (!leader) {
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  // Get followers
  const followers = await models.copyTradingFollower.findAll({
    where: { leaderId: id },
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  // Get recent trades
  const trades = await models.copyTradingTrade.findAll({
    where: { leaderId: id, followerId: null },
    order: [["createdAt", "DESC"]],
    limit: 50,
  });

  // Get audit log
  const auditLog = await models.copyTradingAuditLog.findAll({
    where: { entityType: "LEADER", entityId: id },
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName"],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: 50,
  });

  ctx?.success("Get Copy Trading Leader retrieved successfully");
  return {
    ...leader.toJSON(),
    followers: followers.map((f: any) => f.toJSON()),
    trades: trades.map((t: any) => t.toJSON()),
    auditLog: auditLog.map((a: any) => a.toJSON()),
  };
};
