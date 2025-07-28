import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "Delete Payment Method",
  description: "Deletes an existing custom payment method by its ID. Prevents deletion if the payment method is being used by active offers or ongoing trades.",
  operationId: "deletePaymentMethod",
  tags: ["P2P", "Payment Method"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Payment Method ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Payment method deleted successfully." },
    400: { description: "Cannot delete payment method that is being used by active offers or ongoing trades." },
    401: { description: "Unauthorized." },
    404: { description: "Payment method not found or not owned by user." },
    500: serverErrorResponse,
  },
};

export default async (data: { params?: any; user?: any }) => {
  const { params, user } = data;
  const id = params?.id;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const paymentMethod = await models.p2pPaymentMethod.findByPk(id);
    if (!paymentMethod) {
      throw createError({
        statusCode: 404,
        message: "Payment method not found",
      });
    }

    // Only allow deletion of custom methods owned by the user
    if (!paymentMethod.userId || paymentMethod.userId !== user.id) {
      throw createError({ statusCode: 401, message: "Unauthorized" });
    }

    // Check if payment method is being used by any active offers
    const activeOffers = await models.p2pOffer.findAll({
      include: [
        {
          model: models.p2pPaymentMethod,
          as: "paymentMethods",
          where: { id: paymentMethod.id },
          attributes: ["id"],
          through: { attributes: [] },
        },
      ],
      where: {
        status: ["ACTIVE", "PENDING_APPROVAL", "PAUSED"],
      },
      attributes: ["id", "status"],
    });

    if (activeOffers.length > 0) {
      throw createError({
        statusCode: 400,
        message: `Cannot delete payment method. It is currently being used by ${activeOffers.length} active offer(s). Please pause or cancel these offers first.`,
      });
    }

    // Check if payment method is being used by any ongoing trades
    const ongoingTrades = await models.p2pTrade.findAll({
      include: [
        {
          model: models.p2pOffer,
          as: "offer",
          include: [
            {
              model: models.p2pPaymentMethod,
              as: "paymentMethods",
              where: { id: paymentMethod.id },
              attributes: ["id"],
              through: { attributes: [] },
            },
          ],
          attributes: ["id"],
        },
      ],
      where: {
        status: ["PENDING", "PAID", "DISPUTE_OPEN", "ESCROW_REVIEW"],
      },
      attributes: ["id", "status"],
    });

    if (ongoingTrades.length > 0) {
      throw createError({
        statusCode: 400,
        message: `Cannot delete payment method. It is currently being used by ${ongoingTrades.length} ongoing trade(s). Please wait for these trades to complete.`,
      });
    }

    await paymentMethod.destroy();

    return { message: "Payment method deleted successfully." };
  } catch (err: any) {
    if (err.statusCode) throw err;
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
