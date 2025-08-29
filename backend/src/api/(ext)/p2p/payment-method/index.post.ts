import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Create Payment Method",
  description:
    "Creates a new custom payment method for the authenticated user.",
  operationId: "createPaymentMethod",
  tags: ["P2P", "Payment Method"],
  requiresAuth: true,
  middleware: ["p2pPaymentMethodCreateRateLimit"],
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

  // Import validation
  const { validatePaymentMethod } = await import("../utils/validation");

  try {
    // Validate and sanitize payment method data
    const validatedData = validatePaymentMethod(body);

    // Check if user already has too many payment methods
    const existingCount = await models.p2pPaymentMethod.count({
      where: { 
        userId: user.id,
        deletedAt: null,
      },
    });

    const MAX_PAYMENT_METHODS = 20;
    if (existingCount >= MAX_PAYMENT_METHODS) {
      throw createError({
        statusCode: 400,
        message: `You can only have up to ${MAX_PAYMENT_METHODS} payment methods`,
      });
    }

    // Check for duplicate names only within user's own payment methods
    // Users can create payment methods with the same name as global/system methods
    // since they might have different instructions
    const duplicate = await models.p2pPaymentMethod.findOne({
      where: { 
        userId: user.id,
        name: validatedData.name,
        deletedAt: null,
      },
    });

    if (duplicate) {
      throw createError({
        statusCode: 400,
        message: "You already have a payment method with this name. Please use a different name or edit your existing method.",
      });
    }

    // Create the payment method
    const paymentMethod = await models.p2pPaymentMethod.create({
      userId: user.id,
      ...validatedData,
      available: typeof body.available === "boolean" ? body.available : true,
      isGlobal: false, // User-created methods are never global
      popularityRank: 999, // Set high rank for custom methods so they appear after system methods
    });
    
    console.log(`[P2P Payment Method] Created custom payment method: ${paymentMethod.id} - ${paymentMethod.name} for user ${user.id}`);

    // Log activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "PAYMENT_METHOD",
      action: "CREATED",
      relatedEntity: "PAYMENT_METHOD",
      relatedEntityId: paymentMethod.id,
      details: JSON.stringify({
        name: validatedData.name,
        icon: validatedData.icon,
      }),
    });

    return {
      message: "Payment method created successfully.",
      paymentMethod: {
        id: paymentMethod.id,
        userId: paymentMethod.userId,
        name: paymentMethod.name,
        icon: paymentMethod.icon,
        description: paymentMethod.description,
        instructions: paymentMethod.instructions,
        processingTime: paymentMethod.processingTime,
        available: paymentMethod.available,
        popularityRank: paymentMethod.popularityRank,
        createdAt: paymentMethod.createdAt,
      },
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }
    
    throw createError({
      statusCode: 500,
      message: "Failed to create payment method: " + err.message,
    });
  }
};
