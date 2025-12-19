import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Get current user's P2P offers",
  description: "Retrieves all offers created by the authenticated user, including ACTIVE and PAUSED offers",
  operationId: "getUserP2POffers",
  tags: ["P2P", "Offers"],
  logModule: "P2P",
  logTitle: "Get user's offers",
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
  const { user, ctx } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  ctx?.step("Fetching user's P2P offers");
  try{
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

    ctx?.success(`Retrieved ${processedOffers.length} user offers`);
    return processedOffers;
  } catch (error: any) {
    logger.error("P2P_OFFER", "Error fetching user P2P offers", error);
    ctx?.fail(error.message || "Failed to fetch user offers");
    throw createError(500, "Failed to fetch user offers");
  }
};
