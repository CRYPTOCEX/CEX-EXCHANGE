import { models, sequelize } from "@b/db";
import { serverErrorResponse } from "@b/utils/query";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get P2P Offer by ID",
  description:
    "Retrieves detailed offer data by its ID, including computed seller metrics and ratings.",
  operationId: "getP2POfferById",
  tags: ["P2P", "Offer"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Offer ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Offer retrieved successfully." },
    404: { description: "Offer not found." },
    500: serverErrorResponse,
  },
  requiresAuth: false,
};

export default async (data: { params?: any }) => {
  const { id } = data.params || {};
  try {
    // 1) Fetch offer with associations
    const offer = await models.p2pOffer.findByPk(id, {
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
        {
          model: models.p2pPaymentMethod,
          as: "paymentMethods",
          attributes: ["id", "name", "icon"],
          through: { attributes: [] },
        },
        {
          model: models.p2pOfferFlag,
          as: "flag",
          attributes: ["id", "isFlagged", "reason", "flaggedAt"],
        },
      ],
    });

    if (!offer) {
      return { error: "Offer not found" };
    }

    const plain = offer.get({ plain: true });
    const sellerId = plain.user.id;

    // 2) Compute seller trade metrics
    const totalTrades = await models.p2pTrade.count({ where: { sellerId } });
    const completedTrades = await models.p2pTrade.count({
      where: { sellerId, status: "COMPLETED" },
    });
    const volume =
      (await models.p2pTrade.sum("amount", {
        where: { sellerId, status: "COMPLETED" },
      })) || 0;
    const completionRate = totalTrades
      ? Math.round((completedTrades / totalTrades) * 100)
      : 0;

    // 3) Average response time (minutes between createdAt and paymentConfirmedAt)
    const resp = await models.p2pTrade.findOne({
      where: { sellerId, paymentConfirmedAt: { [Op.ne]: null } },
      attributes: [
        [
          sequelize.fn(
            "AVG",
            sequelize.literal(
              "TIMESTAMPDIFF(MINUTE, `createdAt`, `paymentConfirmedAt`)"
            )
          ),
          "avgResponseTime",
        ],
      ],
      raw: true,
    });
    const avgResponseTime = resp?.avgResponseTime
      ? Math.round(resp.avgResponseTime)
      : null;

    // 4) Aggregate individual review ratings for this seller
    const ratings = await models.p2pReview.findOne({
      where: { revieweeId: sellerId },
      attributes: [
        [
          sequelize.fn("AVG", sequelize.col("communicationRating")),
          "avgCommunication",
        ],
        [sequelize.fn("AVG", sequelize.col("speedRating")), "avgSpeed"],
        [sequelize.fn("AVG", sequelize.col("trustRating")), "avgTrust"],
      ],
      raw: true,
    });

    const avgCommunication =
      ratings?.avgCommunication != null
        ? Math.round(ratings.avgCommunication)
        : null;
    const avgSpeed =
      ratings?.avgSpeed != null ? Math.round(ratings.avgSpeed) : null;
    const avgTrust =
      ratings?.avgTrust != null ? Math.round(ratings.avgTrust) : null;

    // 5) Compute overall average rating
    const avgOverall =
      avgCommunication != null && avgSpeed != null && avgTrust != null
        ? Math.round((avgCommunication + avgSpeed + avgTrust) / 3)
        : null;

    // 6) Attach metrics to seller object
    plain.user.stats = {
      totalTrades,
      volume,
      completionRate,
      avgResponseTime, // minutes
      ratings: {
        communication: avgCommunication,
        speed: avgSpeed,
        trust: avgTrust,
        overall: avgOverall,
      },
    };

    return plain;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
