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
  logModule: "ADMIN_P2P",
  logTitle: "Delete payment method",
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

export default async (data: { params: { id: string }; user?: any; ctx?: any }) => {
  const { params, user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    ctx?.step("Fetching payment method");
    // Find the payment method
    const paymentMethod = await models.p2pPaymentMethod.findByPk(params.id);

    if (!paymentMethod) {
      ctx?.fail("Payment method not found");
      throw createError({
        statusCode: 404,
        message: "Payment method not found",
      });
    }

    ctx?.step("Checking for active offers using payment method");
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
      ctx?.fail(`Payment method is in use by ${offerCount} active offers`);
      throw createError({
        statusCode: 400,
        message: `Cannot delete payment method. It is being used in ${offerCount} active offer(s).`,
      });
    }

    ctx?.step("Deleting payment method");
    // Soft delete the payment method
    await paymentMethod.destroy();

    console.log(`[P2P Admin] Deleted payment method: ${paymentMethod.id} by admin ${user.id}`);

    ctx?.step("Logging admin activity");
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

    ctx?.success("Payment method deleted successfully");
    return {
      message: "Payment method deleted successfully.",
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }

    ctx?.fail("Failed to delete payment method");
    throw createError({
      statusCode: 500,
      message: "Failed to delete payment method: " + err.message,
    });
  }
};