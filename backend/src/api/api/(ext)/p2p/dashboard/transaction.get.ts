import { models } from "@b/db";
import { Op } from "sequelize";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "Get P2P Transactions",
  description:
    "Retrieves recent trade transactions for the authenticated user.",
  operationId: "getP2PTransactions",
  tags: ["P2P", "Dashboard"],
  responses: {
    200: { description: "Transactions retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: { user?: any }) => {
  const { user } = data;
  if (!user?.id) throw new Error("Unauthorized");
  try {
    const transactions = await models.p2pTrade.findAll({
      where: {
        [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      order: [["createdAt", "DESC"]],
      limit: 10,
      raw: true,
    });
    return transactions;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
