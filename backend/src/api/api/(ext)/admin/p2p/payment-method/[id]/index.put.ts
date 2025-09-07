import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Update P2P Payment Method (Admin)",
  description:
    "Updates a payment method. Admin can update any payment method and toggle global status.",
  operationId: "updateP2PPaymentMethod",
  tags: ["Admin", "P2P", "Payment Method"],
  requiresAuth: true,
  permission: "edit.p2p.payment_method",
  parameters: [
    {
      name: "id",
      in: "path",
      description: "Payment method ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Payment method update data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            icon: { type: "string" },
            description: { type: "string" },
            instructions: { type: "string" },
            processingTime: { type: "string" },
            fees: { type: "string" },
            available: { type: "boolean" },
            isGlobal: { type: "boolean" },
            popularityRank: { type: "number" },
          },
        },
      },
    },
  },
  responses: {
    200: { description: "Payment method updated successfully." },
    401: { description: "Unauthorized." },
    403: { description: "Forbidden - Admin access required." },
    404: { description: "Payment method not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params: { id: string }; body: any; user?: any }) => {
  const { params, body, user } = data;
  
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

    // Check for duplicate names if name is being changed
    if (body.name && body.name !== paymentMethod.name) {
      const duplicate = await models.p2pPaymentMethod.findOne({
        where: { 
          name: body.name,
          isGlobal: body.isGlobal !== undefined ? body.isGlobal : paymentMethod.isGlobal,
          id: { [Op.ne]: params.id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw createError({
          statusCode: 400,
          message: "A payment method with this name already exists",
        });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.instructions !== undefined) updateData.instructions = body.instructions;
    if (body.processingTime !== undefined) updateData.processingTime = body.processingTime;
    if (body.fees !== undefined) updateData.fees = body.fees;
    if (body.available !== undefined) updateData.available = body.available;
    if (body.isGlobal !== undefined) updateData.isGlobal = body.isGlobal;
    if (body.popularityRank !== undefined) updateData.popularityRank = body.popularityRank;

    // Update the payment method
    await paymentMethod.update(updateData);
    
    console.log(`[P2P Admin] Updated payment method: ${paymentMethod.id} by admin ${user.id}`);

    // Log admin activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "ADMIN_PAYMENT_METHOD",
      action: "UPDATED",
      relatedEntity: "PAYMENT_METHOD",
      relatedEntityId: paymentMethod.id,
      details: JSON.stringify({
        changes: updateData,
        adminAction: true,
        updatedBy: `${user.firstName} ${user.lastName}`,
        action: "updated",
        name: paymentMethod.name,
      }),
    });

    return {
      message: "Payment method updated successfully.",
      paymentMethod: {
        id: paymentMethod.id,
        userId: paymentMethod.userId,
        name: paymentMethod.name,
        icon: paymentMethod.icon,
        description: paymentMethod.description,
        instructions: paymentMethod.instructions,
        processingTime: paymentMethod.processingTime,
        fees: paymentMethod.fees,
        available: paymentMethod.available,
        isGlobal: paymentMethod.isGlobal,
        popularityRank: paymentMethod.popularityRank,
        updatedAt: paymentMethod.updatedAt,
      },
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }
    
    throw createError({
      statusCode: 500,
      message: "Failed to update payment method: " + err.message,
    });
  }
};