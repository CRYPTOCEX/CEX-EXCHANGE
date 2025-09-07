import { models } from "@b/db";
import { baseStringSchema } from "@b/utils/schema";
import { Op } from "sequelize";

export const baseReferralSchema = {
  id: baseStringSchema("Referral ID"),
  referredId: baseStringSchema("Referred user UUID"),
  referrerId: baseStringSchema("Referrer user UUID"),
  createdAt: baseStringSchema("Date of referral"),
};

export async function listDirectReferrals(user) {
  const referrerId = user.id;

  const referrals = (await models.mlmReferral.findAll({
    where: { referrerId },
    include: [
      {
        model: models.user,
        as: "referred",
        attributes: [
          "id",
          "firstName",
          "lastName",
          "avatar",
          "createdAt",
          "status",
        ],
        include: [
          {
            model: models.mlmReferral,
            as: "referrerReferrals",
            attributes: ["id"],
          },
        ],
      },
      {
        model: models.user,
        as: "referrer",
        include: [
          {
            model: models.mlmReferralReward,
            as: "referralRewards",
            attributes: ["id"],
          },
        ],
      },
    ],
  })) as any;

  const downlines = referrals.map((referral) => ({
    id: referral.referred?.id,
    firstName: referral.referred?.firstName,
    lastName: referral.referred?.lastName,
    avatar: referral.referred?.avatar,
    createdAt: referral.referred?.createdAt,
    status: referral.referred?.status,
    level: 2,
    rewardsCount: 0,
    referredCount: referral.referred?.referrerReferrals?.length || 0,
    downlines: [],
  }));

  const rootUserRewardsCount =
    referrals[0]?.referrer?.referralRewards?.length || 0;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    createdAt: user.createdAt,
    status: user.status,
    level: 1,
    rewardsCount: rootUserRewardsCount,
    referredCount: referrals.length,
    downlines,
  };
}

export async function listUnilevelReferrals(user, mlmSettings) {
  const userId = user.id;

  const directReferrals = user.referrerReferrals || [];
  const rootUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    createdAt: user.createdAt,
    status: user.status,
    level: 1,
    rewardsCount: await models.mlmReferralReward.count({
      where: { referrerId: userId },
    }),
    referredCount: directReferrals.length,
    downlines: [],
  };

  const processedIds = new Set([user.id]);

  async function buildDownlines(referrals, level) {
    if (level > mlmSettings.unilevel.levels || !referrals.length) return [];

    const downlines: any = [];
    for (const referral of referrals) {
      const referredUser = referral.referred;
      if (processedIds.has(referredUser.id)) continue;
      processedIds.add(referredUser.id);

      const nextLevelReferrals = await models.mlmReferral.findAll({
        where: { referrerId: referredUser.id },
        include: [
          {
            model: models.user,
            as: "referred",
            attributes: [
              "id",
              "firstName",
              "lastName",
              "avatar",
              "createdAt",
              "status",
            ],
            include: [
              {
                model: models.mlmReferralReward,
                as: "referralRewards",
                attributes: ["id"],
              },
            ],
          },
        ],
        raw: true,
        nest: true,
      });

      const downline = {
        id: referredUser.id,
        firstName: referredUser.firstName,
        lastName: referredUser.lastName,
        avatar: referredUser.avatar,
        createdAt: referredUser.createdAt,
        status: referredUser.status,
        level,
        rewardsCount: referredUser.referralRewards?.length || 0,
        referredCount: nextLevelReferrals.length,
        downlines: await buildDownlines(nextLevelReferrals, level + 1),
      };
      downlines.push(downline);
    }
    return downlines;
  }

  rootUser.downlines = await buildDownlines(directReferrals, 2);
  return rootUser;
}

export async function listBinaryReferrals(user, mlmSettings) {
  const referrerId = user.id;
  const rootNode = await models.mlmBinaryNode.findOne({
    where: { referralId: referrerId },
    attributes: ["id"],
    raw: true,
  });

  if (!rootNode) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      createdAt: user.createdAt,
      status: user.status,
      level: 1,
      rewardsCount: 0,
      referredCount: 0,
      downlines: [],
    };
  }

  const processedIds = new Set([user.id]);

  async function fetchBinaryDownlines(nodeIds, level = 2) {
    if (level > mlmSettings.binary.levels || level > 10) return []; // Prevent infinite recursion

    const nodes = (await models.mlmBinaryNode.findAll({
      where: { parentId: { [Op.in]: nodeIds } },
      include: [
        {
          model: models.mlmReferral,
          as: "referral",
          include: [
            {
              model: models.user,
              as: "referred",
              attributes: [
                "id",
                "firstName",
                "lastName",
                "avatar",
                "createdAt",
                "status",
              ],
              include: [
                {
                  model: models.mlmReferralReward,
                  as: "referralRewards",
                  attributes: ["id"],
                },
                {
                  model: models.mlmReferral,
                  as: "referrerReferrals",
                  attributes: ["id"],
                },
              ],
            },
          ],
        },
        { model: models.mlmBinaryNode, as: "leftChild", attributes: ["id"] },
        { model: models.mlmBinaryNode, as: "rightChild", attributes: ["id"] },
      ],
      raw: true,
      nest: true,
    })) as any;

    const downlines: any = [];
    for (const node of nodes) {
      const referredUser = node.referral.referred;
      if (processedIds.has(referredUser.id)) continue;
      processedIds.add(referredUser.id);

      const leftDownlines = node.leftChild
        ? await fetchBinaryDownlines([node.leftChild.id], level + 1)
        : [];
      const rightDownlines = node.rightChild
        ? await fetchBinaryDownlines([node.rightChild.id], level + 1)
        : [];

      downlines.push({
        id: referredUser.id,
        firstName: referredUser.firstName,
        lastName: referredUser.lastName,
        avatar: referredUser.avatar,
        createdAt: referredUser.createdAt,
        status: referredUser.status,
        level,
        rewardsCount: referredUser.referralRewards?.length || 0,
        referredCount: referredUser.referrerReferrals?.length || 0,
        downlines: [...leftDownlines, ...rightDownlines],
      });
    }
    return downlines;
  }

  const topLevelDownlines = await fetchBinaryDownlines([rootNode.id], 2);
  const rootUserRewardsCount = await models.mlmReferralReward.count({
    where: { referrerId },
  });

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    createdAt: user.createdAt,
    status: user.status,
    level: 1,
    rewardsCount: rootUserRewardsCount,
    referredCount: topLevelDownlines.reduce(
      (acc, line) => acc + line.referredCount,
      0
    ),
    downlines: topLevelDownlines,
  };
}
