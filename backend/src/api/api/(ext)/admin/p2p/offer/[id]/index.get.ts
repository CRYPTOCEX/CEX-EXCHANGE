import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get P2P Offer by ID (Admin)",
  description: "Retrieves detailed information about a specific offer.",
  operationId: "getAdminP2POfferById",
  tags: ["Admin", "Offers", "P2P"],
  requiresAuth: true,
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
    401: { description: "Unauthorized." },
    404: { description: "Offer not found." },
    500: { description: "Internal Server Error." },
  },
  permission: "view.p2p.offer",
};

export default async (data) => {
  const { params } = data;
  const { id } = params;

  try {
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
