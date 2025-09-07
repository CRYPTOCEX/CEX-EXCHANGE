import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { CacheManager } from "@b/utils/cache";
import { Op, fn, col, literal } from "sequelize";

export const metadata = {
  summary: "Get Affiliate Detail",
  description:
    "Retrieves detail data for a specific affiliate referral record, including referrer profile, network, rewards, and earnings history, based on MLM system.",
  operationId: "getAffiliateDetail",
  tags: ["Affiliate", "Admin", "Detail"],
  requiresAuth: true,
  permission: "view.affiliate.referral",
  parameters: [
    { name: "id", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Affiliate detail retrieved successfully." },
    401: { description: "Unauthorized – Admin privileges required." },
    404: { description: "Referral record not found." },
    500: { description: "Internal Server Error" },
  },
};

interface Handler {
  user?: { id: string };
  params: { id: string };
}

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin privileges required.",
    });
  }
  const referralId = params.id;

  // Load referral record and referrer user
  const referralRecord = await models.mlmReferral.findOne({
    where: { id: referralId },
    include: [
      {
        model: models.user,
        as: "referrer",
        attributes: ["id", "firstName", "lastName", "email", "phone", "status"],
      },
    ],
    raw: false,
  });
  if (!referralRecord?.referrer) {
    throw createError({
      statusCode: 404,
      message: "Referral record not found.",
    });
  }
  const referrer = referralRecord.referrer;
  const affiliateUserId = referrer.id;

  // Basic affiliate profile
  const affiliate = {
    id: affiliateUserId,
    name: `${referrer.firstName || ""} ${referrer.lastName || ""}`.trim(),
    email: referrer.email || "",
    phone: referrer.phone || null,
    location: null,
    status: referrer.status?.toLowerCase(),
    joinDate: referralRecord.createdAt.toISOString(),
    referralCode: referralRecord.id,
  };

  // Summary metrics
  const referralsCount = await models.mlmReferral.count({
    where: { referrerId: affiliateUserId },
  });
  const earningsRow = await models.mlmReferralReward.findOne({
    attributes: [[fn("SUM", col("reward")), "totalEarnings"]],
    where: { referrerId: affiliateUserId },
    raw: true,
  });
  const totalEarnings = parseFloat(earningsRow.totalEarnings) || 0;
  const rewardsCount = await models.mlmReferralReward.count({
    where: { referrerId: affiliateUserId },
  });
  const conversionRate = referralsCount
    ? Math.round((rewardsCount / referralsCount) * 100)
    : 0;
  Object.assign(affiliate, {
    referrals: referralsCount,
    earnings: totalEarnings,
    conversionRate,
  });

  // Determine MLM system
  const cache = CacheManager.getInstance();
  const settings = await cache.getSettings();
  const mlmSystem = settings.has("mlmSystem")
    ? settings.get("mlmSystem")
    : "DIRECT";

  // Build network based on system
  let network: any[] = [];
  if (mlmSystem === "UNILEVEL") {
    // Unilevel: traverse mlmUnilevelNode descendants
    const rootNode = await models.mlmUnilevelNode.findOne({
      where: { referralId },
    });
    if (rootNode) {
      const all = await models.mlmUnilevelNode.findAll({ raw: true });
      const children: Record<string, any[]> = {};
      all.forEach((n) => {
        children[n.parentId] = children[n.parentId] || [];
        if (n.parentId) children[n.parentId].push(n);
      });
      const queue = [{ node: rootNode, level: 1 }];
      while (queue.length) {
        const { node, level } = queue.shift()!;
        for (const child of children[node.id] || []) {
          queue.push({ node: child, level: level + 1 });
          // load referred user
          // Use await instead of unhandled promise to prevent data inconsistency
          const childReferral = await models.mlmReferral.findOne({
            where: { id: child.referralId },
            include: [
              {
                model: models.user,
                as: "referred",
                attributes: [
                  "id",
                  "firstName",
                  "lastName",
                  "email",
                  "status",
                  "createdAt",
                ],
              },
            ],
            raw: false,
          });
          
          if (childReferral?.referred) {
            network.push({
              nodeId: child.id,
              referralId: child.referralId,
              id: childReferral.referred.id,
              name: `${childReferral.referred.firstName} ${childReferral.referred.lastName}`.trim(),
              email: childReferral.referred.email,
              level,
              status: childReferral.referred.status?.toLowerCase(),
              earnings: 0,
              referrals: 0,
              joinDate: childReferral.referred.createdAt.toISOString(),
            });
          }
        }
      }
    }
  } else if (mlmSystem === "BINARY") {
    // Binary: traverse mlmBinaryNode tree (similar BFS on leftChildId/rightChildId)
    const root = await models.mlmBinaryNode.findOne({ where: { referralId } });
    if (root) {
      const queue = [{ node: root, level: 1 }];
      while (queue.length) {
        const { node, level } = queue.shift()!;
        for (const side of ["leftChildId", "rightChildId"]) {
          const childId = (node as any)[side];
          if (childId) {
            // Use await instead of unhandled promises to prevent data inconsistency
            const childNode = await models.mlmBinaryNode.findByPk(childId, { raw: true });
            if (childNode) {
              queue.push({ node: childNode, level: level + 1 });
              
              const childReferral = await models.mlmReferral.findOne({
                where: { id: childNode.referralId },
                include: [
                  {
                    model: models.user,
                    as: "referred",
                    attributes: [
                      "id",
                      "firstName",
                      "lastName",
                      "email",
                      "status",
                      "createdAt",
                    ],
                  },
                ],
                raw: false,
              });
              
              if (childReferral?.referred) {
                network.push({
                  nodeId: childNode.id,
                  referralId: childNode.referralId,
                  id: childReferral.referred.id,
                  name: `${childReferral.referred.firstName} ${childReferral.referred.lastName}`.trim(),
                  email: childReferral.referred.email,
                  level,
                  status: childReferral.referred.status?.toLowerCase(),
                  earnings: 0,
                  referrals: 0,
                  joinDate: childReferral.referred.createdAt.toISOString(),
                });
              }
            }
          }
        }
      }
    }
  } else {
    // DIRECT: immediate referrals only
    const direct = await models.mlmReferral.findAll({
      where: { referrerId: affiliateUserId },
      include: [
        {
          model: models.user,
          as: "referred",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "email",
            "status",
            "createdAt",
          ],
        },
      ],
      raw: false,
    });
    network = direct.map((d) => ({
      nodeId: null,
      referralId: d.id,
      id: d.referred.id,
      name: `${d.referred.firstName} ${d.referred.lastName}`.trim(),
      email: d.referred.email,
      level: 1,
      status: d.referred.status?.toLowerCase(),
      earnings: 0,
      referrals: 0,
      joinDate: d.createdAt.toISOString(),
    }));
  }

  // Enrich network metrics
  if (network.length) {
    const [refAll, earnAll] = await Promise.all([
      models.mlmReferral.findAll({
        attributes: ["referrerId", [fn("COUNT", literal("*")), "cnt"]],
        group: ["referrerId"],
        raw: true,
      }),
      models.mlmReferralReward.findAll({
        attributes: ["referrerId", [fn("SUM", col("reward")), "sum"]],
        group: ["referrerId"],
        raw: true,
      }),
    ]);
    const refMap = Object.fromEntries(
      refAll.map((r) => [r.referrerId, parseInt(r.cnt, 10)])
    );
    const earnMap = Object.fromEntries(
      earnAll.map((r) => [r.referrerId, parseFloat(r.sum)])
    );
    network = network.map((n) => ({
      ...n,
      referrals: refMap[n.id] || 0,
      earnings: earnMap[n.id] || 0,
    }));
  }

  // Reward history
  const rewardsRaw = await models.mlmReferralReward.findAll({
    where: { referrerId: affiliateUserId },
    include: [
      {
        model: models.mlmReferralCondition,
        as: "condition",
        attributes: ["name"],
      },
    ],
    order: [["createdAt", "DESC"]],
    raw: false,
  });
  const rewards = rewardsRaw.map((r) => ({
    id: r.id,
    date: r.createdAt.toISOString(),
    type: r.condition?.name || "",
    description: r.description || "",
    status: r.isClaimed ? "paid" : "pending",
    amount: r.reward,
  }));

  // Monthly earnings (last 6)
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  const earnByMonthRaw = await models.mlmReferralReward.findAll({
    attributes: [
      [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
      [fn("SUM", col("reward")), "amount"],
    ],
    where: {
      referrerId: affiliateUserId,
      createdAt: {
        [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 5, 1)),
      },
    },
    group: ["month"],
    raw: true,
  });
  const earnMonthMap: Record<string, number> = {};
  earnByMonthRaw.forEach((r: any) => {
    earnMonthMap[r.month] = parseFloat(r.amount);
  });
  const monthlyEarnings = months.map((m) => ({
    month: m,
    earnings: earnMonthMap[m] || 0,
  }));

  return { affiliate, network, rewards, monthlyEarnings };
};
