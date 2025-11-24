import { models } from "@b/db";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "Get P2P Trading Activity",
  description:
    "Retrieves recent trading activity logs for the authenticated user.",
  operationId: "getP2PTradingActivity",
  tags: ["P2P", "Dashboard"],
  responses: {
    200: { description: "Trading activity retrieved successfully." },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data: { user?: any }) => {
  const { user } = data;
  if (!user?.id) throw new Error("Unauthorized");
  try {
    const activity = await models.p2pActivityLog.findAll({
      where: { userId: user.id },
      order: [["createdAt", "DESC"]],
      limit: 10,
      raw: true,
    });
    return activity;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
