import { models } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Dispute Trade",
  description:
    "Creates a dispute for a trade by providing a reason and description.",
  operationId: "disputeP2PTrade",
  tags: ["P2P", "Trade"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Trade ID",
      required: true,
      schema: { type: "string" },
    },
  ],
  requestBody: {
    description: "Dispute details",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: { type: "string" },
            description: { type: "string" },
          },
          required: ["reason", "description"],
        },
      },
    },
  },
  responses: {
    200: { description: "Dispute created successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any; body: any; user?: any }) => {
  const { id } = data.params || {};
  const { reason, description } = data.body;
  const { user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const trade = await models.p2pTrade.findOne({
    where: {
      id,
      [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
    },
  });
  if (!trade) {
    throw createError({ statusCode: 404, message: "Trade not found" });
  }

  try {
    const dispute = await models.p2pDispute.create({
      tradeId: id,
      amount: trade.total.toString(),
      reportedById: user.id,
      againstId: trade.sellerId, // adjust logic based on user role
      reason,
      details: description,
      filedOn: new Date(),
      status: "PENDING",
      priority: "MEDIUM",
    });
    return { message: "Dispute created successfully.", disputeId: dispute.id };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
