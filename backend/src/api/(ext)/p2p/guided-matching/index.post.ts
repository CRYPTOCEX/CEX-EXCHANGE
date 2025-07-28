import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import {
  getFiatPriceInUSD,
  getSpotPriceInUSD,
  getEcoPriceInUSD,
} from "@b/api/finance/currency/utils"; // <-- path as in your project

export const metadata = {
  summary: "Submit Guided Matching Criteria",
  description:
    "Finds matching offers based on guided matching criteria provided by the authenticated user.",
  operationId: "submitP2PGuidedMatching",
  tags: ["P2P", "Guided Matching"],
  requiresAuth: true,
  requestBody: {
    description: "Guided matching criteria",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            tradeType: { type: "string", enum: ["buy", "sell"] },
            cryptocurrency: { type: "string" },
            amount: { type: "string" },
            paymentMethods: { type: "array", items: { type: "string" } },
            pricePreference: { type: "string" },
            traderPreference: { type: "string" },
            location: { type: "string" },
          },
          required: [
            "tradeType",
            "cryptocurrency",
            "amount",
            "paymentMethods",
            "pricePreference",
            "traderPreference",
            "location",
          ],
        },
      },
    },
  },
  responses: {
    200: { description: "Matching results retrieved successfully." },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
};

// Smart Score Calculation Helper
const calculateMatchScore = ({
  price,
  bestPrice,
  completionRate,
  verified,
  methodOverlap,
}) => {
  let score = 0;
  score +=
    bestPrice && price
      ? (1 - Math.abs((price - bestPrice) / bestPrice)) * 40
      : 0;
  score += (completionRate || 0) * 0.3;
  score += verified ? 20 : 0;
  score += methodOverlap ? 10 : 0;
  return Math.round(score);
};

// Utility: fetch market price based on wallet type
async function getMarketPrice(currency: string, walletType: string) {
  switch (walletType) {
    case "FIAT":
      return getFiatPriceInUSD(currency);
    case "SPOT":
      return getSpotPriceInUSD(currency);
    case "ECO":
      return getEcoPriceInUSD(currency);
    default:
      return null;
  }
}

export default async (data: { body: any; user?: any }) => {
  const { body, user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  try {
    // Parse amount as number
    const amount = parseFloat(body.amount) || 0;

    // Fetch all eligible offers in one query, with associated user and payment methods
    const offers = await models.p2pOffer.findAll({
      where: {
        currency: body.cryptocurrency,
        type: body.tradeType.toUpperCase(),
        status: "ACTIVE",
        ...(amount && {
          "amountConfig.min": { [Op.lte]: amount },
          "amountConfig.max": { [Op.gte]: amount },
        }),
        ...(body.location &&
          body.location !== "any" && {
            "locationSettings.country": body.location,
          }),
      },
      include: [
        {
          model: models.p2pPaymentMethod,
          as: "paymentMethods",
          attributes: ["id", "name"],
          through: { attributes: [] }, // exclude join table fields
        },
        {
          model: models.user,
          as: "user",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "avatar",
            "profile",
            "emailVerified",
          ],
          include: [
            {
              model: models.p2pTrade,
              as: "p2pTrades",
              attributes: ["id", "status"],
            },
            {
              model: models.p2pReview,
              as: "p2pReviews", // Fixed: use correct alias from user model association
              attributes: ["communicationRating", "speedRating", "trustRating"],
              where: {
                revieweeId: { [Op.col]: "user.id" } // Only get reviews where user is the reviewee
              },
              required: false, // LEFT JOIN to include users with no reviews
            },
          ],
        },
      ],
      limit: 30,
      order: [["priceConfig.finalPrice", "ASC"]],
    });

    if (!offers.length) {
      return {
        matches: [],
        matchCount: 0,
        estimatedSavings: 0,
        bestPrice: 0,
      };
    }

    // Extract prices for savings calculation
    const prices = offers.map((o) => o.priceConfig.finalPrice);
    const bestPrice =
      body.tradeType === "buy" ? Math.min(...prices) : Math.max(...prices);

    // Fetch market price via utility (FIAT, SPOT, ECO)
    let marketPrice: number | null = null;
    try {
      marketPrice = await getMarketPrice(
        body.cryptocurrency,
        offers[0].walletType
      );
    } catch (e) {
      // fallback: use average price
      marketPrice = prices.reduce((a, b) => a + b, 0) / (prices.length || 1);
    }

    // Prepare user criteria payment method ids (as string, since IDs may be UUIDs)
    const userMethodIds = new Set(body.paymentMethods);

    // Transform and score offers
    const scoredOffers = offers.map((offer) => {
      // Payment methods
      const paymentMethods = (offer.paymentMethods || []).map((pm) => pm.name);

      // Method overlap: count intersection with userMethodIds
      const offerMethodIds = (offer.paymentMethods || []).map((pm) => pm.id);
      const methodOverlap = offerMethodIds.some((id) => userMethodIds.has(id))
        ? 1
        : 0;

      // Trader info
      const trader = offer.user;
      let traderName = trader?.firstName || "Trader";
      if (trader?.lastName) traderName += " " + trader.lastName;

      // Trader completion stats
      const trades = trader?.p2pTrades || [];
      const completed = trades.filter((t) => t.status === "COMPLETED").length;
      const total = trades.length || 1;
      const completionRate = Math.round((completed / total) * 100);

      // Calculate average rating from p2pReviews (filtered to received reviews)
      const reviews = trader?.p2pReviews || [];
      let avgRating = 0;
      if (reviews.length > 0) {
        avgRating =
          reviews.reduce(
            (sum, r) =>
              sum +
              (r.communicationRating || 0) +
              (r.speedRating || 0) +
              (r.trustRating || 0),
            0
          ) /
          (reviews.length * 3);
        avgRating = Math.round(avgRating * 10) / 10;
      }

      // Verified
      const verified = !!trader?.emailVerified;

      // Final offer response
      return {
        id: offer.id,
        type: offer.type.toLowerCase(),
        coin: offer.currency,
        walletType: offer.walletType,
        price: offer.priceConfig.finalPrice,
        minLimit: offer.amountConfig.min,
        maxLimit: offer.amountConfig.max,
        availableAmount:
          offer.amountConfig.availableBalance || offer.amountConfig.total,
        paymentMethods,
        matchScore: calculateMatchScore({
          price: offer.priceConfig.finalPrice,
          bestPrice,
          completionRate,
          verified,
          methodOverlap,
        }),
        trader: {
          id: trader?.id,
          name: traderName,
          avatar: trader?.avatar,
          completedTrades: completed,
          completionRate,
          verified,
          responseTime: 5, // placeholder
          avgRating,
        },
        benefits: [
          completionRate > 90 ? "High completion rate" : "Solid completion",
          avgRating > 90 ? "Highly rated" : "Community trusted",
          methodOverlap ? "Your preferred payment method" : "Flexible payments",
          verified ? "KYC Verified" : "Active user",
        ],
        location: offer.locationSettings?.country || "Global",
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
      };
    });

    // Sort by matchScore DESC
    scoredOffers.sort((a, b) => b.matchScore - a.matchScore);

    // Calculate estimated savings
    let estimatedSavings = 0;
    if (marketPrice && bestPrice) {
      if (body.tradeType === "buy") {
        estimatedSavings = (marketPrice - bestPrice) * amount;
      } else if (body.tradeType === "sell") {
        estimatedSavings = (bestPrice - marketPrice) * amount;
      }
      estimatedSavings =
        Math.round((estimatedSavings + Number.EPSILON) * 100) / 100;
    }

    return {
      matches: scoredOffers,
      matchCount: scoredOffers.length,
      estimatedSavings,
      bestPrice,
    };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
