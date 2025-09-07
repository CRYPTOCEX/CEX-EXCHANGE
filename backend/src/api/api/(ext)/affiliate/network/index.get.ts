import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { CacheManager } from "@b/utils/cache";
import { Op, fn, col } from "sequelize";
import {
  listDirectReferrals,
  listBinaryReferrals,
  listUnilevelReferrals,
} from "@b/api/(ext)/affiliate/utils";

export const metadata = {
  summary: "Get Affiliate Network Node",
  description:
    "Retrieves the current user's affiliate network data for client visualization.",
  operationId: "getAffiliateNetworkNode",
  tags: ["Affiliate", "Network"],
  requiresAuth: true,
  responses: {
    200: { description: "Network data retrieved successfully." },
    401: { description: "Unauthorized – login required." },
    404: { description: "User not found." },
    500: { description: "Internal Server Error" },
  },
};

interface Handler {
  user?: { id: string };
}

export default async function handler(data: Handler) {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Load MLM settings
  const cache = CacheManager.getInstance();
  const mlmSettingsRaw = await cache.getSetting("mlmSettings");
  const mlmSettings = mlmSettingsRaw ? JSON.parse(mlmSettingsRaw) : {};
  const mlmSystem = (await cache.getSetting("mlmSystem")) as
    | "DIRECT"
    | "BINARY"
    | "UNILEVEL"
    | null;

  // Fetch user record
  const userRecord = await models.user.findByPk(user.id, {
    attributes: [
      "id",
      "firstName",
      "lastName",
      "avatar",
      "status",
      "createdAt",
    ],
    raw: true,
  });
  if (!userRecord) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  // Build base profile
  const userProfile = {
    id: userRecord.id,
    firstName: userRecord.firstName,
    lastName: userRecord.lastName,
    avatar: userRecord.avatar,
    status: userRecord.status,
    joinDate: userRecord.createdAt.toISOString(),
  };

  // Total rewards sum
  const rewardsRow = await models.mlmReferralReward.findOne({
    attributes: [[fn("SUM", col("reward")), "totalRewards"]],
    where: { referrerId: user.id },
    raw: true,
  });
  const totalRewards = parseFloat(rewardsRow?.totalRewards as any) || 0;

  // Upline lookup
  let upline: any = null;
  const upr = await models.mlmReferral.findOne({
    where: { referredId: user.id },
    include: [
      {
        model: models.user,
        as: "referrer",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "avatar",
          "status",
          "createdAt",
        ],
      },
    ],
    raw: true,
    nest: true,
  });
  if (upr?.referrer) {
    const r = upr.referrer;
    const rRewards = parseFloat(
      (
        await models.mlmReferralReward.count({ where: { referrerId: r.id } })
      ).toString()
    );
    const rTeam = await models.mlmReferral.count({
      where: { referrerId: r.id },
    });
    upline = {
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      avatar: r.avatar,
      status: r.status,
      joinDate: r.createdAt.toISOString(),
      earnings: rRewards,
      teamSize: rTeam,
      performance: rTeam > 0 ? Math.round((rRewards / rTeam) * 100) : 0,
    };
  }

  // Fetch raw tree data
  let treeDataRaw: any;
  switch (mlmSystem) {
    case "BINARY":
      treeDataRaw = await listBinaryReferrals(userRecord, mlmSettings);
      break;
    case "UNILEVEL":
      treeDataRaw = await listUnilevelReferrals(userRecord, mlmSettings);
      break;
    default:
      treeDataRaw = await listDirectReferrals(userRecord);
  }

  // Recursive normalization with depth limit to prevent memory exhaustion
  function normalizeNode(n: any, level = 0, visited = new Set()): any {
    // Prevent infinite recursion and memory leaks
    if (level > 50 || visited.has(n.id)) {
      return null;
    }
    
    visited.add(n.id);
    
    const joinDate =
      n.joinDate ||
      (n.createdAt ? new Date(n.createdAt).toISOString() : undefined);
    const earnings = n.earnings ?? n.rewardsCount ?? 0;
    const teamSize =
      n.teamSize ?? n.referredCount ?? (n.downlines?.length || 0);
    const performance = teamSize ? Math.round((earnings / teamSize) * 100) : 0;
    
    const downlines = (n.downlines || [])
      .slice(0, 1000) // Limit number of downlines to prevent memory issues
      .map((c: any) => normalizeNode(c, level + 1, new Set(visited)))
      .filter(Boolean); // Remove null entries
      
    return {
      id: n.id,
      firstName: n.firstName,
      lastName: n.lastName,
      avatar: n.avatar,
      status: n.status,
      joinDate,
      earnings,
      teamSize,
      performance,
      role: n.role || (level === 0 ? "You" : ""),
      level,
      downlines,
    };
  }
  const treeData = normalizeNode(treeDataRaw, 0);

  // Shape for tabs
  let referrals: any[] | undefined;
  let binaryStructure: any | undefined;
  let levels: any[][] | undefined;

  if (mlmSystem === "DIRECT") {
    referrals = treeData.downlines.map((node: any) => ({
      id: node.id,
      referred: node,
      referrerId: user.id,
      status: node.status,
      createdAt: node.joinDate,
      earnings: node.earnings,
      teamSize: node.teamSize,
      performance: node.performance,
      downlines: node.downlines,
    }));
  }

  if (mlmSystem === "BINARY") {
    const [left, right] = treeData.downlines;
    binaryStructure = { left: left || null, right: right || null };
  }

  if (mlmSystem === "UNILEVEL") {
    const lvlMap: Record<number, any[]> = {};
    function gather(n: any, depth = 0) {
      if (!lvlMap[depth]) lvlMap[depth] = [];
      if (depth > 0) lvlMap[depth].push(n);
      n.downlines.forEach((c: any) => gather(c, depth + 1));
    }
    gather(treeData, 0);
    levels = Object.keys(lvlMap)
      .map((k) => Number(k))
      .sort((a, b) => a - b)
      .filter((d) => d > 0)
      .map((d) => lvlMap[d]);
  }

  // Enrich root user
  const enrichedUser = {
    ...userProfile,
    earnings: totalRewards,
    teamSize: treeData.teamSize,
    performance: treeData.performance,
    role: "You",
  };

  return {
    user: enrichedUser,
    totalRewards,
    upline,
    referrals,
    binaryStructure,
    levels,
    treeData,
  };
}
