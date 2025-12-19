import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { serverErrorResponse } from "@b/utils/query";
import { Op } from "sequelize";

export const metadata = {
  summary: "Update Payment Method",
  description: "Updates an existing custom payment method by its ID.",
  operationId: "updatePaymentMethod",
  tags: ["P2P", "Payment Method"],
  requiresAuth: true,
  logModule: "P2P_PAYMENT",
  logTitle: "Update payment method",
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
  requestBody: {
    description: "Fields to update for the payment method",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            instructions: { type: "string" },
            metadata: {
              type: "object",
              description: "Flexible key-value pairs for payment details",
              additionalProperties: { type: "string" },
            },
            processingTime: { type: "string" },
            available: { type: "boolean" },
          },
        },
      },
    },
  },
  responses: {
    200: { description: "Payment method updated successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Payment method not found or not owned by user." },
    409: { description: "Cannot edit payment method with active trades." },
    500: serverErrorResponse,
  },
};

export default async (data: { params?: any; body: any; user?: any; ctx?: any }) => {
  const { params, body, user, ctx } = data;
  const id = params?.id;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Finding and validating payment method ownership");
  try {
    const paymentMethod = await models.p2pPaymentMethod.findByPk(id);
    if (!paymentMethod) {
      throw createError({
        statusCode: 404,
        message: "Payment method not found",
      });
    }

    // Ensure only owner can update their custom methods
    if (paymentMethod.userId !== user.id) {
      throw createError({ statusCode: 401, message: "Unauthorized - you can only edit your own payment methods" });
    }

    // Check if this payment method is used in any active trades
    const activeTrade = await models.p2pTrade.findOne({
      where: {
        paymentMethod: id,
        status: { [Op.in]: ["PENDING", "PAYMENT_SENT", "DISPUTED"] }
      }
    });

    if (activeTrade) {
      throw createError({
        statusCode: 409,
        message: "Cannot edit payment method while it is being used in an active trade. Please wait for all trades using this method to complete or be cancelled."
      });
    }

    // Sanitize metadata if provided
    let sanitizedMetadata = paymentMethod.metadata;
    if (body.metadata !== undefined) {
      if (body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)) {
        sanitizedMetadata = {};
        const MAX_FIELDS = 20;
        let fieldCount = 0;
        for (const [key, value] of Object.entries(body.metadata)) {
          if (fieldCount >= MAX_FIELDS) break;
          if (typeof key === "string" && typeof value === "string") {
            const sanitizedKey = key.trim().substring(0, 100);
            const sanitizedValue = value.trim().substring(0, 500);
            if (sanitizedKey && sanitizedValue) {
              sanitizedMetadata[sanitizedKey] = sanitizedValue;
              fieldCount++;
            }
          }
        }
        // Set to null if empty
        if (Object.keys(sanitizedMetadata).length === 0) {
          sanitizedMetadata = null;
        }
      } else {
        sanitizedMetadata = null;
      }
    }

    ctx?.step("Updating payment method");
    // Update allowed fields (no icon for custom methods)
    await paymentMethod.update({
      name: body.name ?? paymentMethod.name,
      description: body.description ?? paymentMethod.description,
      instructions: body.instructions ?? paymentMethod.instructions,
      metadata: sanitizedMetadata,
      processingTime: body.processingTime ?? paymentMethod.processingTime,
      available:
        typeof body.available === "boolean"
          ? body.available
          : paymentMethod.available,
    });

    ctx?.success(`Updated payment method: ${paymentMethod.name}`);

    return {
      message: "Payment method updated successfully.",
      paymentMethod: paymentMethod.toJSON(),
    };
  } catch (err: any) {
    if (err.statusCode) throw err;
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
