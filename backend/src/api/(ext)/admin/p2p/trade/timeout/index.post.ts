import { p2pTradeTimeout } from "@b/utils/crons/p2pTradeTimeout";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Manually Trigger P2P Trade Timeout",
  description: "Manually triggers the P2P trade timeout process to expire trades that have passed their expiration time. Admin-only endpoint.",
  operationId: "triggerP2PTradeTimeout",
  tags: ["Admin", "P2P", "Trades", "Cron"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Trade timeout process completed successfully",
    },
    401: {
      description: "Unauthorized - Admin access required",
    },
    500: {
      description: "Internal Server Error",
    },
  },
  permission: "edit.p2p.trade",
};

export default async (data: any) => {
  const { user } = data;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin access required",
    });
  }

  try {
    // Execute the timeout handler
    await p2pTradeTimeout();

    return {
      message: "P2P trade timeout process completed successfully",
      executedBy: user.id,
      executedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to execute P2P trade timeout process",
    });
  }
};
