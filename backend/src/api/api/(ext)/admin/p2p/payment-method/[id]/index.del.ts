import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { QueryTypes } from "sequelize";

export const metadata = {
  summary: "Delete P2P Payment Method (Admin)",
  description:
    "Soft deletes a payment method. Admin can delete any payment method.",
  operationId: "deleteP2PPaymentMethod",
  tags: ["Admin", "P2P", "Payment Method"],
  requiresAuth: true,
  permission: "delete.p2p.payment_method",
  parameters: [
    {
      name: "id",
      in: "path",
      description: "Payment method ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Payment method deleted successfully." },
    401: { description: "Unauthorized." },
    403: { description: "Forbidden - Admin access required." },
    404: { description: "Payment method not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params: { id: string }; user?: any }) => {
  const { params, user } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Find the payment method
    const paymentMethod = await models.p2pPaymentMethod.findByPk(params.id);
    
    if (!paymentMethod) {
      throw createError({
        statusCode: 404,
        message: "Payment method not found",
      });
    }

    // Check if payment method is being used in active offers
    const activeOffers = await sequelize.query(
      `SELECT COUNT(*) as count 
       FROM p2p_offer_payment_method opm
       JOIN p2p_offers o ON opm.offerId = o.id
       WHERE opm.paymentMethodId = :methodId 
       AND o.status = 'ACTIVE'
       AND o.deletedAt IS NULL`,
      {
        replacements: { methodId: params.id },
        type: QueryTypes.SELECT,
      }
    ) as { count: string }[];

    const offerCount = parseInt((activeOffers[0]?.count || '0'), 10);
    if (offerCount > 0) {
      throw createError({
        statusCode: 400,
        message: `Cannot delete payment method. It is being used in ${offerCount} active offer(s).`,
      });
    }

    // Soft delete the payment method
    await paymentMethod.destroy();
    
    console.log(`[P2P Admin] Deleted payment method: ${paymentMethod.id} by admin ${user.id}`);

    // Log admin activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "ADMIN_PAYMENT_METHOD",
      action: "DELETED",
      relatedEntity: "PAYMENT_METHOD",
      relatedEntityId: paymentMethod.id,
      details: JSON.stringify({
        name: paymentMethod.name,
        isGlobal: paymentMethod.isGlobal,
        adminAction: true,
        updatedBy: `${user.firstName} ${user.lastName}`,
        action: "deleted",
      }),
    });

    return {
      message: "Payment method deleted successfully.",
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }
    
    throw createError({
      statusCode: 500,
      message: "Failed to delete payment method: " + err.message,
    });
  }
};