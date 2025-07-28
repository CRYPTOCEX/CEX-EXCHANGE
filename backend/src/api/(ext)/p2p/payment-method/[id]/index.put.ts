import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "Update Payment Method",
  description: "Updates an existing custom payment method by its ID.",
  operationId: "updatePaymentMethod",
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
  requestBody: {
    description: "Fields to update for the payment method",
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
            available: { type: "boolean" },
          },
          additionalProperties: false,
        },
      },
    },
  },
  responses: {
    200: { description: "Payment method updated successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Payment method not found or not owned by user." },
    500: serverErrorResponse,
  },
};

export default async (data: { params?: any; body: any; user?: any }) => {
  const { params, body, user } = data;
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

    // Ensure only owner can update their custom methods
    if (paymentMethod.userId && paymentMethod.userId !== user.id) {
      throw createError({ statusCode: 401, message: "Unauthorized" });
    }

    // Update allowed fields
    await paymentMethod.update({
      name: body.name ?? paymentMethod.name,
      icon: body.icon ?? paymentMethod.icon,
      description: body.description ?? paymentMethod.description,
      instructions: body.instructions ?? paymentMethod.instructions,
      processingTime: body.processingTime ?? paymentMethod.processingTime,
      available:
        typeof body.available === "boolean"
          ? body.available
          : paymentMethod.available,
    });

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
