import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get P2P offer by ID",
  description: "Retrieves detailed information about a specific P2P offer including user details, payment methods, statistics, and pricing configuration.",
  operationId: "getAdminP2POfferById",
  tags: ["Admin", "P2P", "Offer"],
  requiresAuth: true,
  logModule: "ADMIN_P2P",
  logTitle: "Get P2P Offer",
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
    401: unauthorizedResponse,
    404: notFoundResponse("Resource"),
    500: serverErrorResponse,
  },
  permission: "view.p2p.offer",
  demoMask: ["user.email"],
};

export default async (data) => {
  const { params, ctx } = data;
  const { id } = params;

  try {
    ctx?.step("Fetching data");
    const offer = await models.p2pOffer.findByPk(id, {
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar", "createdAt"],
        },
        {
          model: models.p2pPaymentMethod,
          as: "paymentMethods",
          attributes: ["id", "name", "icon"],
          through: { attributes: [] },
        },
      ],
    });
    
    if (!offer) {
      throw createError({ statusCode: 404, message: "Offer not found" });
    }
    
    // Calculate some statistics (optional)
    const stats = {
      totalTrades: 0,
      completedTrades: 0,
      avgCompletionTime: 0,
      successRate: 0,
    };
    
    // Get user stats
    const userStats = {
      totalOffers: await models.p2pOffer.count({ where: { userId: offer.userId } }),
      completedTrades: 0, // You can add actual trade counting logic here
      rating: 0,
      disputes: 0,
    };
    
    const result = offer.toJSON();
    result.stats = stats;
    result.user = { ...result.user, stats: userStats };

    // Extract priceCurrency from priceConfig
    if (!result.priceCurrency && result.priceConfig) {
      result.priceCurrency = result.priceConfig.currency || "USD";
    }

    ctx?.success("Operation completed successfully");
    return result;
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
