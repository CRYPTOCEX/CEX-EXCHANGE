import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Create Global P2P Payment Method",
  description:
    "Creates a new global payment method that is available to all users. Admin only.",
  operationId: "createGlobalP2PPaymentMethod",
  tags: ["Admin", "P2P", "Payment Method"],
  requiresAuth: true,
  permission: "create.p2p.payment_method",
  requestBody: {
    description: "Global payment method data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            name: { 
              type: "string",
              description: "Payment method name"
            },
            icon: { 
              type: "string",
              description: "Icon URL or icon class"
            },
            description: { 
              type: "string",
              description: "Payment method description"
            },
            instructions: { 
              type: "string",
              description: "Instructions for using this payment method"
            },
            processingTime: { 
              type: "string",
              description: "Expected processing time"
            },
            fees: { 
              type: "string",
              description: "Fee information"
            },
            available: { 
              type: "boolean",
              description: "Whether the payment method is currently available"
            },
            popularityRank: {
              type: "number",
              description: "Sorting rank (lower numbers appear first)"
            }
          },
          required: ["name", "icon"],
        },
      },
    },
  },
  responses: {
    200: { description: "Global payment method created successfully." },
    401: { description: "Unauthorized." },
    403: { description: "Forbidden - Admin access required." },
    400: { description: "Bad request - Invalid data." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { body: any; user?: any }) => {
  const { body, user } = data;
  
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Validate required fields
    if (!body.name || !body.icon) {
      throw createError({
        statusCode: 400,
        message: "Name and icon are required fields",
      });
    }

    // Check for duplicate names among global methods
    const duplicate = await models.p2pPaymentMethod.findOne({
      where: { 
        name: body.name,
        isGlobal: true,
        deletedAt: null,
      },
    });

    if (duplicate) {
      throw createError({
        statusCode: 400,
        message: "A global payment method with this name already exists",
      });
    }

    // Create the global payment method
    const paymentMethod = await models.p2pPaymentMethod.create({
      userId: null, // null for admin-created methods
      name: body.name,
      icon: body.icon,
      description: body.description || null,
      instructions: body.instructions || null,
      processingTime: body.processingTime || null,
      fees: body.fees || null,
      available: body.available !== false, // Default to true
      isGlobal: true, // Mark as global
      popularityRank: body.popularityRank || 0,
    });
    
    console.log(`[P2P Admin] Created global payment method: ${paymentMethod.id} - ${paymentMethod.name} by admin ${user.id}`);

    // Log admin activity
    await models.p2pActivityLog.create({
      userId: user.id,
      type: "ADMIN_PAYMENT_METHOD",
      action: "CREATED",
      relatedEntity: "PAYMENT_METHOD",
      relatedEntityId: paymentMethod.id,
      details: JSON.stringify({
        name: body.name,
        icon: body.icon,
        isGlobal: true,
        adminAction: true,
        updatedBy: `${user.firstName} ${user.lastName}`,
        action: "created",
      }),
    });

    return {
      message: "Global payment method created successfully.",
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
        createdAt: paymentMethod.createdAt,
      },
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }
    
    throw createError({
      statusCode: 500,
      message: "Failed to create global payment method: " + err.message,
    });
  }
};