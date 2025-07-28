import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Create Payment Method",
  description:
    "Creates a new custom payment method for the authenticated user.",
  operationId: "createPaymentMethod",
  tags: ["P2P", "Payment Method"],
  requiresAuth: true,
  requestBody: {
    description: "Payment method data",
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
          required: ["name"],
        },
      },
    },
  },
  responses: {
    200: { description: "Payment method created successfully." },
    401: { description: "Unauthorized." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { body: any; user?: any }) => {
  const { body, user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const paymentMethod = await models.p2pPaymentMethod.create({
      userId: user.id,
      name: body.name,
      icon: body.icon || "credit-card",
      description: body.description,
      instructions: body.instructions,
      processingTime: body.processingTime,
      available: typeof body.available === "boolean" ? body.available : true,
    });

    return {
      message: "Payment method created successfully.",
      paymentMethod,
    };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
