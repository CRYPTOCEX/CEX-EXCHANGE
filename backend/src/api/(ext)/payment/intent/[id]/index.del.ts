import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Delete a payment intent",
  description: "Cancel and remove a specific payment intent.",
  operationId: "deletePaymentIntent",
  tags: ["Payments"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "The ID of the payment intent to delete.",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Payment intent deleted successfully." },
    404: { description: "Payment intent not found." },
    500: { description: "Server error." },
  },
};

export default async (data: Handler) => {
  const { params, user } = data;
  const { id } = params;

  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  try {
    const paymentIntent = await models.paymentIntent.findOne({
      where: { id, userId: user.id, status: "PENDING" },
    });

    if (!paymentIntent) {
      throw createError(404, "Payment Intent not found or cannot be canceled.");
    }

    // Delete the payment intent and associated products
    await paymentIntent.destroy();

    return { message: "Payment intent deleted successfully." };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to delete payment intent.",
    });
  }
};
