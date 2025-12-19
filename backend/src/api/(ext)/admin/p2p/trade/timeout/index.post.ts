import { p2pTradeTimeout } from "@b/api/(ext)/p2p/utils/cron";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Manually Trigger P2P Trade Timeout",
  description: "Manually triggers the P2P trade timeout process to expire trades that have passed their expiration time. Admin-only endpoint.",
  operationId: "triggerP2PTradeTimeout",
  tags: ["Admin", "P2P", "Trades", "Cron"],
  requiresAuth: true,
  logModule: "ADMIN_P2P",
  logTitle: "Trigger trade timeout",
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
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: Admin access required",
    });
  }

  try {
    ctx?.step("Executing trade timeout process");
    // Execute the timeout handler
    await p2pTradeTimeout();

    ctx?.success("Trade timeout process completed successfully");
    return {
      message: "P2P trade timeout process completed successfully",
      executedBy: user.id,
      executedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    ctx?.fail("Failed to execute trade timeout process");
    throw createError({
      statusCode: 500,
      message: error.message || "Failed to execute P2P trade timeout process",
    });
  }
};
