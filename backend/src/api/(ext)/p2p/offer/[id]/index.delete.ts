import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Delete a P2P offer",
  description: "Deletes a P2P offer. Only the owner can delete their offer.",
  operationId: "deleteP2POffer",
  tags: ["P2P", "Offers"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the offer to delete",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requiresAuth: true,
  responses: {
    200: {
      description: "Offer deleted successfully",
    },
    401: unauthorizedResponse,
    403: {
      description: "Forbidden - You don't have permission to delete this offer",
    },
    404: notFoundMetadataResponse("Offer"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  const { id } = params;

  try {
    // Find the offer
    const offer = await models.p2pOffer.findByPk(id);

    if (!offer) {
      throw createError(404, "Offer not found");
    }

    // Check if user owns the offer
    if (offer.userId !== user.id) {
      throw createError(403, "You don't have permission to delete this offer");
    }

    // Check if offer has active trades
    const activeTrades = await models.p2pTrade.count({
      where: {
        offerId: id,
        status: { [Op.in]: ["PENDING", "ACTIVE", "ESCROW", "PAID", "PAYMENT_SENT"] },
      },
    });

    if (activeTrades > 0) {
      throw createError(
        400,
        "Cannot delete offer with active trades. Please wait for all trades to complete or cancel them first."
      );
    }

    // Delete the offer
    await offer.destroy();

    return {
      message: "Offer deleted successfully",
    };
  } catch (error: any) {
    console.error("Error deleting P2P offer:", error);
    throw error;
  }
};
