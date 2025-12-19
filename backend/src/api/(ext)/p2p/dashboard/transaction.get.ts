import { models } from "@b/db";
import { Op } from "sequelize";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "Get P2P Transactions",
  description:
    "Retrieves recent trade transactions for the authenticated user.",
  operationId: "getP2PTransactions",
  tags: ["P2P", "Dashboard"],
  logModule: "P2P",
  logTitle: "Get transactions",
  responses: {
    200: { description: "Transactions retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: { user?: any; ctx?: any }) => {
  const { user, ctx } = data;
  if (!user?.id) throw new Error("Unauthorized");

  ctx?.step("Fetching recent transactions");
  try {
    const transactions = await models.p2pTrade.findAll({
      where: {
        [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      order: [["createdAt", "DESC"]],
      limit: 10,
      raw: true,
    });

    ctx?.success(`Retrieved ${transactions.length} transactions`);
    return transactions;
  } catch (err: any) {
    ctx?.fail(err.message || "Failed to retrieve transactions");
    throw new Error("Internal Server Error: " + err.message);
  }
};
