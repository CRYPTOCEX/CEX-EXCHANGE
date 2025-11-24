import { models } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Submit Trade Review",
  description: "Submits a review for a trade with rating and feedback.",
  operationId: "reviewP2PTrade",
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
    description: "Review data",
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            rating: { type: "number" },
            feedback: { type: "string" },
          },
          required: ["rating", "feedback"],
        },
      },
    },
  },
  responses: {
    200: { description: "Review submitted successfully." },
    401: { description: "Unauthorized." },
    404: { description: "Trade not found." },
    500: { description: "Internal Server Error." },
  },
};

export default async (data: { params?: any; body: any; user?: any }) => {
  const { id } = data.params || {};
  const { rating, feedback } = data.body;
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
    await models.p2pReview.create({
      reviewerId: user.id,
      revieweeId: trade.sellerId, // adjust based on user role
      tradeId: id,
      rating,
      comment: feedback,
    });
    return { message: "Review submitted successfully." };
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: "Internal Server Error: " + err.message,
    });
  }
};
