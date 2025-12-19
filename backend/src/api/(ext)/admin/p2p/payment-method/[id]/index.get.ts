import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get P2P Payment Method by ID (Admin)",
  description: "Retrieves a single payment method by its ID.",
  operationId: "getP2PPaymentMethodById",
  tags: ["Admin", "P2P", "Payment Method"],
  requiresAuth: true,
  logModule: "ADMIN_P2P",
  logTitle: "Get P2P Payment Method",
  permission: "view.p2p.payment_method",
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
    200: { description: "Payment method retrieved successfully." },
    401: { description: "Unauthorized." },
    403: { description: "Forbidden - Admin access required." },
    404: { description: "Payment method not found." },
    500: { description: "Internal Server Error." },
  },
  demoMask: ["user.email"],
};

export default async (data: { params: { id: string, ctx }; user?: any }) => {
  const { params, user, ctx } = data as any;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    ctx?.step("Fetching data");
    const paymentMethod = await models.p2pPaymentMethod.findOne({
      where: {
        id: params.id,
        deletedAt: null,
      },
      include: [
        {
          association: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    if (!paymentMethod) {
      throw createError({
        statusCode: 404,
        message: "Payment method not found",
      });
    }

    ctx?.success("Operation completed successfully");
    return {
      id: paymentMethod.id,
      userId: paymentMethod.userId,
      name: paymentMethod.name,
      icon: paymentMethod.icon,
      description: paymentMethod.description,
      instructions: paymentMethod.instructions,
      metadata: paymentMethod.metadata,
      processingTime: paymentMethod.processingTime,
      fees: paymentMethod.fees,
      available: paymentMethod.available,
      isGlobal: paymentMethod.isGlobal,
      popularityRank: paymentMethod.popularityRank,
      createdAt: paymentMethod.createdAt,
      updatedAt: paymentMethod.updatedAt,
      user: paymentMethod.user,
    };
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }

    throw createError({
      statusCode: 500,
      message: "Failed to get payment method: " + err.message,
    });
  }
};
