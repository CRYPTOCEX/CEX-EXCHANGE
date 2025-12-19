// Apply to become a copy trading leader
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  checkLeaderEligibility,
  createAuditLog,
  notifyLeaderApplicationEvent,
  notifyCopyTradingAdmins,
} from "@b/api/(ext)/copy-trading/utils";
import {
  validateLeaderApplication,
  throwValidationError,
} from "@b/api/(ext)/copy-trading/utils/security";

export const metadata = {
  summary: "Apply to Become a Copy Trading Leader",
  description:
    "Submit an application to become a copy trading leader. Requires approval from admin.",
  operationId: "applyToBecomeLeader",
  tags: ["Copy Trading", "Leaders"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Apply as leader",
  middleware: ["copyTradingLeaderApply"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            displayName: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              description: "Public display name",
            },
            bio: {
              type: "string",
              maxLength: 1000,
              description: "Short biography",
            },
            tradingStyle: {
              type: "string",
              enum: ["SCALPING", "DAY_TRADING", "SWING", "POSITION"],
              description: "Primary trading style",
            },
            riskLevel: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH"],
              description: "Risk level of trading strategy",
            },
            profitSharePercent: {
              type: "number",
              minimum: 0,
              maximum: 50,
              description: "Percentage of profit to share with leader",
            },
            applicationNote: {
              type: "string",
              maxLength: 2000,
              description: "Additional notes for the application",
            },
            markets: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  symbol: { type: "string" },
                  minBase: { type: "number", minimum: 0 },
                  minQuote: { type: "number", minimum: 0 },
                },
                required: ["symbol"],
              },
              minItems: 1,
              description: "Array of market objects with symbol and optional min allocations",
            },
          },
          required: ["displayName", "tradingStyle", "riskLevel", "markets"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Application submitted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              leader: { type: "object" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    429: { description: "Too Many Requests" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Validating application");
  // Validate and sanitize input
  const validation = validateLeaderApplication(body);
  if (!validation.valid) {
    throwValidationError(validation);
  }

  const {
    displayName,
    bio,
    tradingStyle,
    riskLevel,
    profitSharePercent = 10,
    applicationNote,
  } = validation.sanitized;

  // Markets validation - from body since it's not in the security validation
  const { markets } = body;
  if (!markets || !Array.isArray(markets) || markets.length === 0) {
    throw createError({
      statusCode: 400,
      message: "At least one trading market is required",
    });
  }

  // Validate all markets exist
  ctx?.step("Validating markets");
  const validatedMarkets: Array<{
    symbol: string;
    baseCurrency: string;
    quoteCurrency: string;
    minBase: number;
    minQuote: number;
  }> = [];

  for (const marketItem of markets) {
    // Support both string format (legacy) and object format (new)
    const symbol = typeof marketItem === "string" ? marketItem : marketItem.symbol;
    const minBase = typeof marketItem === "object" ? (marketItem.minBase || 0) : 0;
    const minQuote = typeof marketItem === "object" ? (marketItem.minQuote || 0) : 0;

    if (typeof symbol !== "string") {
      throw createError({
        statusCode: 400,
        message: "Invalid market symbol format",
      });
    }
    const parts = symbol.split("/");
    if (parts.length !== 2) {
      throw createError({
        statusCode: 400,
        message: `Invalid symbol format: ${symbol}. Use BASE/QUOTE (e.g., BTC/USDT)`,
      });
    }
    const [baseCurrency, quoteCurrency] = parts;

    const market = await models.ecosystemMarket.findOne({
      where: { currency: baseCurrency, pair: quoteCurrency, status: true },
    });

    if (!market) {
      throw createError({
        statusCode: 400,
        message: `Invalid or inactive market: ${symbol}`,
      });
    }

    validatedMarkets.push({ symbol, baseCurrency, quoteCurrency, minBase, minQuote });
  }

  ctx?.step("Checking eligibility");
  // Check eligibility
  const eligibility = await checkLeaderEligibility(user.id);
  if (!eligibility.eligible) {
    throw createError({
      statusCode: 400,
      message: eligibility.reason || "Eligibility check failed",
    });
  }

  ctx?.step("Checking existing application");
  // Check if user already has a leader application (including rejected ones that might be re-applying)
  const existingLeader = await models.copyTradingLeader.findOne({
    where: { userId: user.id },
    paranoid: false, // Include soft-deleted
  });

  ctx?.step("Checking auto-approve setting");
  // Check if auto-approve is enabled
  const autoApproveSetting = await models.settings.findOne({
    where: { key: "copyTradingAutoApproveLeaders" },
  });
  const autoApprove = autoApproveSetting?.value === "true" || autoApproveSetting?.value === true;

  ctx?.step("Creating application");
  const t = await sequelize.transaction();

  try {
    let leader;
    if (existingLeader && existingLeader.status === "REJECTED") {
      // Allow re-application after rejection
      leader = await existingLeader.update(
        {
          displayName,
          bio,
          tradingStyle,
          riskLevel,
          profitSharePercent,
          applicationNote,
          status: autoApprove ? "ACTIVE" : "PENDING",
          rejectionReason: null,
          deletedAt: null,
        },
        { transaction: t }
      );

      // Remove old markets and create new ones
      await models.copyTradingLeaderMarket.destroy({
        where: { leaderId: leader.id },
        transaction: t,
      });
    } else if (existingLeader) {
      throw createError({
        statusCode: 400,
        message: "You already have an active leader application",
      });
    } else {
      // Create new application
      leader = await models.copyTradingLeader.create(
        {
          userId: user.id,
          displayName,
          bio,
          tradingStyle,
          riskLevel,
          profitSharePercent,
          maxFollowers: 100, // Default
          applicationNote,
          status: autoApprove ? "ACTIVE" : "PENDING",
          isPublic: true,
        },
        { transaction: t }
      );
    }

    // Create leader markets
    ctx?.step("Creating leader markets");
    for (const marketData of validatedMarkets) {
      await models.copyTradingLeaderMarket.create(
        {
          leaderId: leader.id,
          symbol: marketData.symbol,
          baseCurrency: marketData.baseCurrency,
          quoteCurrency: marketData.quoteCurrency,
          minBase: marketData.minBase,
          minQuote: marketData.minQuote,
          isActive: true,
        },
        { transaction: t }
      );
    }

    // Create audit log
    await createAuditLog(
      {
        entityType: "LEADER",
        entityId: leader.id,
        action: "CREATE",
        newValue: { ...leader.toJSON(), markets: validatedMarkets },
        userId: user.id,
      },
      t
    );

    await t.commit();

    // Notify user about application submission or approval
    ctx?.step("Sending application notification");
    if (autoApprove) {
      await notifyLeaderApplicationEvent(user.id, leader.id, "APPROVED", undefined, ctx);
    } else {
      await notifyLeaderApplicationEvent(user.id, leader.id, "APPLIED", undefined, ctx);
    }

    // Notify admins about new application (only if not auto-approved)
    if (!autoApprove) {
      await notifyCopyTradingAdmins(
        "LEADER_APPLICATION",
        {
          leaderId: leader.id,
          userName: `${user.firstName} ${user.lastName}`,
        },
        ctx
      );
    }

    ctx?.success(autoApprove ? "Application auto-approved" : "Application submitted");
    return {
      message: autoApprove
        ? "Application approved successfully. You can now accept followers."
        : "Application submitted successfully. Pending admin approval.",
      leader: { ...leader.toJSON(), markets: validatedMarkets },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};
