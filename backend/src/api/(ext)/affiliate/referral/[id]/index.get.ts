// File: /api/affiliate/referral/[id].ts
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get details for a single referral",
  operationId: "getAffiliateReferral",
  tags: ["Affiliate", "Referral"],
  requiresAuth: true,
  parameters: [
    { name: "id", in: "path", required: true, schema: { type: "string" } },
  ],
  responses: {
    200: { description: "Referral details retrieved successfully." },
    401: { description: "Unauthorized" },
    404: { description: "Not Found" },
    500: { description: "Internal Server Error" },
  },
};

export default async function handler(data: Handler) {
  // Authenticate user
  const { user, params } = data;
  if (!user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Extract referral ID from path or query
  const referralId = params.id as string;
  if (!referralId) {
    throw createError({ statusCode: 400, message: "Referral ID is required" });
  }

  // Fetch the referral, ensuring it belongs to the current user
  const referral = await models.mlmReferral.findOne({
    where: { id: referralId, referrerId: user.id },
    include: [
      {
        model: models.user,
        as: "referred",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });
  if (!referral) {
    throw createError({ statusCode: 404, message: "Referral not found" });
  }

  // Compute earnings summary
  const totalEarnings = (await models.mlmReferralReward.sum("reward", {
    where: { referrerId: user.id },
  })) as number | null;
  const pendingRewards = (await models.mlmReferralReward.sum("reward", {
    where: { referrerId: user.id, isClaimed: false },
  })) as number | null;
  const lastRewardRecord = await models.mlmReferralReward.findOne({
    where: { referrerId: user.id },
    order: [["createdAt", "DESC"]],
  });

  // Build earnings object
  const earnings = {
    total: totalEarnings || 0,
    pending: pendingRewards || 0,
    lastReward: lastRewardRecord
      ? {
          amount: lastRewardRecord.reward,
          date: lastRewardRecord.createdAt,
        }
      : null,
  };

  // Build activity timeline: invite + rewards
  const timeline: Array<{ type: string; title: string; date: Date }> = [];
  timeline.push({
    type: "invite",
    title: "Invitation sent",
    date: referral.createdAt,
  });
  const rewardEvents = await models.mlmReferralReward.findAll({
    where: { referrerId: user.id },
    order: [["createdAt", "ASC"]],
  });
  for (const r of rewardEvents) {
    timeline.push({
      type: "reward",
      title: `Reward: $${r.reward.toFixed(2)}`,
      date: r.createdAt,
    });
  }

  return {
    referral,
    earnings,
    timeline,
  };
}
