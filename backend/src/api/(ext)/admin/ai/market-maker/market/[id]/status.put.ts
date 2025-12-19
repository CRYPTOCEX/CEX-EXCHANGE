import { models } from "@b/db";
import { statusChangeSchema } from "../../utils";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";
import MarketMakerEngine from "../../utils/engine/MarketMakerEngine";
import { CacheManager } from "@b/utils/cache";

export const metadata: OperationObject = {
  summary: "Update AI Market Maker market status",
  operationId: "updateAiMarketMakerMarketStatus",
  tags: ["Admin", "AI Market Maker", "Market"],
  description:
    "Changes the operational status of an AI Market Maker market (START/PAUSE/STOP/RESUME). Validates state transitions, checks minimum liquidity requirements for START action, synchronizes with the MarketMakerEngine, updates bot statuses accordingly, and logs all status changes to history. Enforces proper lifecycle management.",
  logModule: "ADMIN_MM",
  logTitle: "Update Market Maker Status",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: statusChangeSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Status updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              status: { type: "string" },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("AI Market Maker Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ai.market-maker.market",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;
  const { action } = body;

  ctx?.step("Fetch market maker with related data");
  const marketMaker = await models.aiMarketMaker.findByPk(params.id, {
    include: [
      { model: models.aiMarketMakerPool, as: "pool" },
      { model: models.aiBot, as: "bots" },
    ],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  const pool = marketMaker.pool as any;
  const currentStatus = marketMaker.status;

  ctx?.step("Validate state transition");
  // Validate state transitions
  const validTransitions: Record<string, string[]> = {
    STOPPED: ["START"],
    INITIALIZING: ["START"],
    ACTIVE: ["PAUSE", "STOP"],
    PAUSED: ["RESUME", "STOP"],
  };

  if (!validTransitions[currentStatus]?.includes(action)) {
    throw createError(
      400,
      `Cannot ${action} from ${currentStatus} status. Valid actions: ${validTransitions[currentStatus]?.join(", ") || "none"}`
    );
  }

  // Additional validations for START
  if (action === "START") {
    // Check minimum liquidity
    if (!pool || Number(pool.totalValueLocked) <= 0) {
      throw createError(
        400,
        "Cannot start market maker without liquidity. Please deposit funds first."
      );
    }

    // Check minimum quote balance requirement from centralized settings
    const cacheManager = CacheManager.getInstance();
    const minLiquidity = Number(await cacheManager.getSetting("aiMarketMakerMinLiquidity")) || 0;
    const quoteBalance = Number(pool?.quoteCurrencyBalance || 0);

    if (minLiquidity > 0 && quoteBalance < minLiquidity) {
      // Get market info for better error message
      const market = await models.ecosystemMarket.findByPk(marketMaker.marketId);
      const quoteCurrency = market?.pair || "quote currency";
      throw createError(
        400,
        `Insufficient liquidity. Minimum required: ${minLiquidity} ${quoteCurrency}, ` +
          `Pool has: ${quoteBalance.toFixed(2)} ${quoteCurrency}. ` +
          `Please deposit more funds or adjust the minimum liquidity setting.`
      );
    }

    // Check if we have bots
    const bots = marketMaker.bots as any[];
    if (!bots || bots.length === 0) {
      throw createError(
        400,
        "Cannot start market maker without bots configured."
      );
    }
  }

  ctx?.step("Execute status change through engine");
  // Get the market manager from the engine
  const engine = MarketMakerEngine;
  const marketManager = engine.getMarketManager();

  // Determine new status and execute action via engine
  let newStatus: "ACTIVE" | "PAUSED" | "STOPPED";
  let success = true;

  switch (action) {
    case "START":
      newStatus = "ACTIVE";
      // IMPORTANT: Update DB status FIRST so the cron job doesn't interfere
      // The cron syncs DB status with engine state - if DB says STOPPED while engine says RUNNING,
      // the cron will stop the market
      await marketMaker.update({ status: newStatus });
      // Activate bots BEFORE starting the market (engine loads only ACTIVE bots)
      await models.aiBot.update(
        { status: "ACTIVE" },
        { where: { marketMakerId: marketMaker.id } }
      );
      if (marketManager) {
        success = await marketManager.startMarket(params.id);
        if (!success) {
          // Rollback status if start failed
          await marketMaker.update({ status: currentStatus });
        }
      }
      break;
    case "PAUSE":
      newStatus = "PAUSED";
      await marketMaker.update({ status: newStatus });
      if (marketManager) {
        success = await marketManager.pauseMarket(params.id);
        if (!success) {
          await marketMaker.update({ status: currentStatus });
        }
      }
      break;
    case "RESUME":
      newStatus = "ACTIVE";
      await marketMaker.update({ status: newStatus });
      // Activate bots for resume as well
      await models.aiBot.update(
        { status: "ACTIVE" },
        { where: { marketMakerId: marketMaker.id } }
      );
      if (marketManager) {
        success = await marketManager.resumeMarket(params.id);
        if (!success) {
          await marketMaker.update({ status: currentStatus });
        }
      }
      break;
    case "STOP":
      newStatus = "STOPPED";
      // For STOP, let the engine update the DB (it does this in stopMarket)
      if (marketManager) {
        success = await marketManager.stopMarket(params.id);
      } else {
        await marketMaker.update({ status: newStatus });
      }
      break;
    default:
      throw createError(400, "Invalid action");
  }

  if (!success) {
    throw createError(500, `Failed to ${action.toLowerCase()} market maker`);
  }

  // Update bot statuses accordingly (if not already done by engine)
  const bots = marketMaker.bots as any[];
  if (bots && bots.length > 0) {
    const botStatus = newStatus === "ACTIVE" ? "ACTIVE" : "PAUSED";
    await models.aiBot.update(
      { status: botStatus },
      { where: { marketMakerId: marketMaker.id } }
    );
  }

  // Log status change (only if not already done by engine)
  if (!marketManager) {
    await models.aiMarketMakerHistory.create({
      marketMakerId: marketMaker.id,
      action: action,
      details: {
        previousStatus: currentStatus,
        newStatus,
        triggeredBy: "admin",
      },
      priceAtAction: marketMaker.targetPrice,
      poolValueAtAction: pool?.totalValueLocked || 0,
    });
  }

  ctx?.success("Market maker status updated successfully");
  return {
    message: `AI Market Maker ${action.toLowerCase()}ed successfully`,
    status: newStatus,
  };
};
