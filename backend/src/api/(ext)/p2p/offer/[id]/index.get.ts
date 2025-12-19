import { models } from "@b/db";
import { serverErrorResponse } from "@b/utils/query";
import { fn, col, literal, Op } from "sequelize";

export const metadata = {
  summary: "Get P2P Offer by ID",
  description:
    "Retrieves detailed offer data by its ID, including computed seller metrics and ratings.",
  operationId: "getP2POfferById",
  tags: ["P2P", "Offer"],
  logModule: "P2P",
  logTitle: "Get offer by ID",
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

export default async (data: { params?: any; ctx?: any }) => {
  const { id } = data.params || {};
  const { ctx } = data || {};

  ctx?.step("Fetching offer details");
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

    ctx?.step("Calculating seller metrics");
    // Note: View count is incremented when a trade is initiated (in initiate-trade.post.ts)
    // This ensures only serious interest is counted and prevents owner inflation

    // Extract priceCurrency from priceConfig if not set at top level
    if (!plain.priceCurrency && plain.priceConfig) {
      plain.priceCurrency = plain.priceConfig.currency || "USD";
    }

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
          fn(
            "AVG",
            literal(
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
          fn("AVG", col("communicationRating")),
          "avgCommunication",
        ],
        [fn("AVG", col("speedRating")), "avgSpeed"],
        [fn("AVG", col("trustRating")), "avgTrust"],
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

    ctx?.success(`Retrieved offer ${id.slice(0, 8)}...`);
    return plain;
  } catch (err: any) {
    ctx?.fail(err.message || "Failed to retrieve offer");
    throw new Error("Internal Server Error: " + err.message);
  }
};
