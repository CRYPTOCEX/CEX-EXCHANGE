import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Get current user's P2P offers",
  description: "Retrieves all offers created by the authenticated user, including ACTIVE and PAUSED offers",
  operationId: "getUserP2POffers",
  tags: ["P2P", "Offers"],
  requiresAuth: true,
  responses: {
    200: {
      description: "User offers retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const offers = await models.p2pOffer.findAll({
      where: {
        userId: user.id,
        status: {
          [Op.in]: ["ACTIVE", "PAUSED", "PENDING_APPROVAL"], // Include all relevant statuses
        },
      },
      include: [
        {
          model: models.p2pPaymentMethod,
          as: "paymentMethods",
          attributes: ["id", "name", "icon"],
          through: { attributes: [] },
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Extract priceCurrency from priceConfig for each offer
    const processedOffers = offers.map((offer: any) => {
      const plain = offer.get({ plain: true });
      if (!plain.priceCurrency && plain.priceConfig) {
        plain.priceCurrency = plain.priceConfig.currency || "USD";
      }
      return plain;
    });

    return processedOffers;
  } catch (error: any) {
    console.error("Error fetching user P2P offers:", error);
    throw createError(500, "Failed to fetch user offers");
  }
};
