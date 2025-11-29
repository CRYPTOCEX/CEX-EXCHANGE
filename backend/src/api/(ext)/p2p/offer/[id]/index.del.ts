import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { Op } from "sequelize";
import { getWalletSafe } from "@b/api/finance/wallet/utils";
import { parseAmountConfig } from "@b/api/(ext)/p2p/utils/json-parser";

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

  const transaction = await sequelize.transaction();

  try {
    // Find the offer with lock
    const offer = await models.p2pOffer.findByPk(id, {
      lock: true,
      transaction,
    });

    if (!offer) {
      await transaction.rollback();
      throw createError(404, "Offer not found");
    }

    // Check if user owns the offer
    if (offer.userId !== user.id) {
      await transaction.rollback();
      throw createError(403, "You don't have permission to delete this offer");
    }

    // Check if offer has active trades
    const activeTrades = await models.p2pTrade.count({
      where: {
        offerId: id,
        status: { [Op.in]: ["PENDING", "ACTIVE", "ESCROW", "PAID", "PAYMENT_SENT"] },
      },
      transaction,
    });

    if (activeTrades > 0) {
      await transaction.rollback();
      throw createError(
        400,
        "Cannot delete offer with active trades. Please wait for all trades to complete or cancel them first."
      );
    }

    // For SELL offers, unlock the funds that were locked when offer was created
    // This applies to ALL wallet types including FIAT
    if (offer.type === "SELL") {
      // Parse amountConfig with robust parser
      const amountConfig = parseAmountConfig(offer.amountConfig);
      const lockedAmount = amountConfig.total;

      if (lockedAmount > 0) {
        const wallet = await getWalletSafe(user.id, offer.walletType, offer.currency);

        if (wallet && wallet.inOrder >= lockedAmount) {
          // Store old value before update for logging
          const previousInOrder = wallet.inOrder;

          // Unlock the funds by decreasing inOrder
          await models.wallet.update(
            {
              inOrder: wallet.inOrder - lockedAmount,
            },
            {
              where: { id: wallet.id },
              transaction,
            }
          );

          console.log('[P2P Offer Delete] Unlocked funds:', {
            userId: user.id,
            walletId: wallet.id,
            walletType: offer.walletType,
            currency: offer.currency,
            amount: lockedAmount,
            previousInOrder: previousInOrder,
            newInOrder: previousInOrder - lockedAmount,
            note: offer.walletType === "FIAT"
              ? "FIAT balance unlocked on platform"
              : "Crypto balance unlocked from escrow"
          });
        }
      }
    }

    // Delete the offer
    await offer.destroy({ transaction });

    await transaction.commit();

    return {
      message: "Offer deleted successfully",
    };
  } catch (error: any) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        // Transaction may already be finished, ignore rollback errors
      }
    }
    console.error("Error deleting P2P offer:", error);
    throw error;
  }
};
