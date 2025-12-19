// Security - Rate limiting and input validation for copy trading
import { createRateLimiter } from "@b/handler/Middleware";
import { createError } from "@b/utils/error";
import { getCopyTradingSettings } from "./index";
import { RedisSingleton } from "@b/utils/redis";

// ============================================================================
// RATE LIMITERS
// ============================================================================

/**
 * Dynamic rate limiter for leader applications
 * Uses settings from database for the limit
 */
async function leaderApplyRateLimiter(data: any): Promise<void> {
  const { user } = data;
  const settings = await getCopyTradingSettings();
  const limit = settings.leaderApplicationRateLimit || 10;
  const window = 86400; // 24 hours
  const keyPrefix = "copytrading:leader:apply";
  const message = "Too many leader applications. Please wait 24 hours before trying again.";

  let key: string;
  if (user?.id) {
    key = `${keyPrefix}:user:${user.id}`;
  } else {
    const clientIp = data.req?.ip || data.req?.connection?.remoteAddress || "unknown";
    key = `${keyPrefix}:ip:${clientIp}`;
  }

  const redis = RedisSingleton.getInstance();
  const current = await redis.get(key);

  if (current !== null && parseInt(current, 10) >= limit) {
    throw createError({ statusCode: 429, message });
  }

  // Increment or set the counter
  if (current === null) {
    await redis.set(key, "1", "EX", window);
  } else {
    await redis.incr(key);
  }
}

/**
 * Copy Trading Rate Limiters
 * Different rate limits for different operation types
 */
export const copyTradingRateLimiters = {
  // Leader application - dynamic limit from settings
  leaderApply: leaderApplyRateLimiter,

  // Leader profile updates
  leaderUpdate: createRateLimiter({
    limit: 10,
    window: 3600, // 1 hour
    keyPrefix: "copytrading:leader:update",
    message: "Too many profile updates. Please wait before making more changes.",
  }),

  // Follow a leader - moderate limit
  followerFollow: createRateLimiter({
    limit: 10,
    window: 3600, // 1 hour
    keyPrefix: "copytrading:follower:follow",
    message:
      "Too many follow requests. Please wait before following more leaders.",
  }),

  // Follower subscription actions (pause, resume, stop)
  followerAction: createRateLimiter({
    limit: 30,
    window: 3600, // 1 hour
    keyPrefix: "copytrading:follower:action",
    message: "Too many subscription actions. Please slow down.",
  }),

  // Fund management (add/remove funds)
  fundManagement: createRateLimiter({
    limit: 20,
    window: 3600, // 1 hour
    keyPrefix: "copytrading:funds",
    message: "Too many fund operations. Please wait before making more changes.",
  }),

  // Trade queries - lighter limit
  tradeQuery: createRateLimiter({
    limit: 100,
    window: 60, // 1 minute
    keyPrefix: "copytrading:trade:query",
    message: "Too many requests. Please slow down.",
  }),

  // Analytics queries
  analyticsQuery: createRateLimiter({
    limit: 30,
    window: 60, // 1 minute
    keyPrefix: "copytrading:analytics",
    message: "Too many analytics requests. Please wait.",
  }),

  // WebSocket subscriptions
  wsSubscribe: createRateLimiter({
    limit: 50,
    window: 60, // 1 minute
    keyPrefix: "copytrading:ws:subscribe",
    message: "Too many WebSocket subscriptions. Please wait.",
  }),

  // Admin actions - stricter for safety
  adminAction: createRateLimiter({
    limit: 50,
    window: 3600, // 1 hour
    keyPrefix: "copytrading:admin",
    message: "Too many admin actions. Please wait.",
  }),
};

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: any;
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return typeof value === "string" && uuidRegex.test(value);
}

/**
 * Sanitize string input - prevent XSS and SQL injection
 */
export function sanitizeString(
  value: string,
  maxLength: number = 1000
): string {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, "") // Basic XSS prevention
    .replace(/'/g, "''") // SQL escape single quotes
    .replace(/\\/g, "\\\\"); // Escape backslashes
}

/**
 * Validate numeric value within range
 */
export function validateNumber(
  value: any,
  options: {
    min?: number;
    max?: number;
    allowZero?: boolean;
    allowNegative?: boolean;
  } = {}
): { valid: boolean; value: number; error?: string } {
  const { min, max, allowZero = true, allowNegative = false } = options;

  const num = parseFloat(value);

  if (isNaN(num)) {
    return { valid: false, value: 0, error: "Invalid number" };
  }

  if (!allowZero && num === 0) {
    return { valid: false, value: 0, error: "Zero is not allowed" };
  }

  if (!allowNegative && num < 0) {
    return { valid: false, value: 0, error: "Negative values are not allowed" };
  }

  if (min !== undefined && num < min) {
    return { valid: false, value: num, error: `Value must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return {
      valid: false,
      value: num,
      error: `Value must not exceed ${max}`,
    };
  }

  return { valid: true, value: num };
}

/**
 * Validate leader application input
 */
export function validateLeaderApplication(body: any): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  // Display name validation
  if (!body.displayName || typeof body.displayName !== "string") {
    errors.push("Display name is required");
  } else {
    const displayName = sanitizeString(body.displayName, 100);
    if (displayName.length < 2) {
      errors.push("Display name must be at least 2 characters");
    } else if (displayName.length > 100) {
      errors.push("Display name must not exceed 100 characters");
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(displayName)) {
      errors.push(
        "Display name can only contain letters, numbers, spaces, hyphens, and underscores"
      );
    } else {
      sanitized.displayName = displayName;
    }
  }

  // Bio validation (optional)
  if (body.bio) {
    sanitized.bio = sanitizeString(body.bio, 1000);
  }

  // Trading style validation
  const validTradingStyles = ["SCALPING", "DAY_TRADING", "SWING", "POSITION"];
  if (!body.tradingStyle || !validTradingStyles.includes(body.tradingStyle)) {
    errors.push(
      `Trading style must be one of: ${validTradingStyles.join(", ")}`
    );
  } else {
    sanitized.tradingStyle = body.tradingStyle;
  }

  // Risk level validation
  const validRiskLevels = ["LOW", "MEDIUM", "HIGH"];
  if (!body.riskLevel || !validRiskLevels.includes(body.riskLevel)) {
    errors.push(`Risk level must be one of: ${validRiskLevels.join(", ")}`);
  } else {
    sanitized.riskLevel = body.riskLevel;
  }

  // Profit share validation
  if (body.profitSharePercent !== undefined) {
    const profitShare = validateNumber(body.profitSharePercent, {
      min: 0,
      max: 50,
    });
    if (!profitShare.valid) {
      errors.push(`Profit share: ${profitShare.error}`);
    } else {
      sanitized.profitSharePercent = profitShare.value;
    }
  }

  // Minimum follow amount validation
  if (body.minFollowAmount !== undefined) {
    const minAmount = validateNumber(body.minFollowAmount, {
      min: 0,
      max: 1000000,
    });
    if (!minAmount.valid) {
      errors.push(`Minimum follow amount: ${minAmount.error}`);
    } else {
      sanitized.minFollowAmount = minAmount.value;
    }
  }

  // Application note validation (optional)
  if (body.applicationNote) {
    sanitized.applicationNote = sanitizeString(body.applicationNote, 2000);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate follow request input
 */
export function validateFollowRequest(body: any): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  // Leader ID validation
  if (!body.leaderId) {
    errors.push("Leader ID is required");
  } else if (!isValidUUID(body.leaderId)) {
    errors.push("Invalid leader ID format");
  } else {
    sanitized.leaderId = body.leaderId;
  }

  // Copy mode validation
  const validCopyModes = ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"];
  if (body.copyMode && !validCopyModes.includes(body.copyMode)) {
    errors.push(`Copy mode must be one of: ${validCopyModes.join(", ")}`);
  } else {
    sanitized.copyMode = body.copyMode || "PROPORTIONAL";
  }

  // Fixed amount validation (for FIXED_AMOUNT mode)
  if (sanitized.copyMode === "FIXED_AMOUNT") {
    if (!body.fixedAmount) {
      errors.push("Fixed amount is required for FIXED_AMOUNT mode");
    } else {
      const fixedAmount = validateNumber(body.fixedAmount, {
        min: 0.01,
        max: 100000,
        allowZero: false,
      });
      if (!fixedAmount.valid) {
        errors.push(`Fixed amount: ${fixedAmount.error}`);
      } else {
        sanitized.fixedAmount = fixedAmount.value;
      }
    }
  }

  // Fixed ratio validation (for FIXED_RATIO mode)
  if (sanitized.copyMode === "FIXED_RATIO") {
    if (!body.fixedRatio) {
      errors.push("Fixed ratio is required for FIXED_RATIO mode");
    } else {
      const fixedRatio = validateNumber(body.fixedRatio, {
        min: 0.01,
        max: 10,
        allowZero: false,
      });
      if (!fixedRatio.valid) {
        errors.push(`Fixed ratio: ${fixedRatio.error}`);
      } else {
        sanitized.fixedRatio = fixedRatio.value;
      }
    }
  }

  // Risk management settings
  if (body.maxDailyLoss !== undefined) {
    const maxLoss = validateNumber(body.maxDailyLoss, { min: 0, max: 100 });
    if (!maxLoss.valid) {
      errors.push(`Max daily loss: ${maxLoss.error}`);
    } else {
      sanitized.maxDailyLoss = maxLoss.value;
    }
  }

  if (body.maxPositionSize !== undefined) {
    const maxPos = validateNumber(body.maxPositionSize, { min: 0, max: 100 });
    if (!maxPos.valid) {
      errors.push(`Max position size: ${maxPos.error}`);
    } else {
      sanitized.maxPositionSize = maxPos.value;
    }
  }

  if (body.stopLossPercent !== undefined) {
    const stopLoss = validateNumber(body.stopLossPercent, { min: 0, max: 100 });
    if (!stopLoss.valid) {
      errors.push(`Stop loss: ${stopLoss.error}`);
    } else {
      sanitized.stopLossPercent = stopLoss.value;
    }
  }

  if (body.takeProfitPercent !== undefined) {
    const takeProfit = validateNumber(body.takeProfitPercent, {
      min: 0,
      max: 1000,
    });
    if (!takeProfit.valid) {
      errors.push(`Take profit: ${takeProfit.error}`);
    } else {
      sanitized.takeProfitPercent = takeProfit.value;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate fund operation (add/remove funds)
 */
export function validateFundOperation(body: any): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  // Amount validation
  if (!body.amount) {
    errors.push("Amount is required");
  } else {
    const amount = validateNumber(body.amount, {
      min: 0.01,
      max: 10000000,
      allowZero: false,
    });
    if (!amount.valid) {
      errors.push(`Amount: ${amount.error}`);
    } else {
      sanitized.amount = amount.value;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate subscription update
 */
export function validateSubscriptionUpdate(body: any): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  // Copy mode validation
  if (body.copyMode) {
    const validCopyModes = ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"];
    if (!validCopyModes.includes(body.copyMode)) {
      errors.push(`Copy mode must be one of: ${validCopyModes.join(", ")}`);
    } else {
      sanitized.copyMode = body.copyMode;
    }
  }

  // Fixed amount validation
  if (body.fixedAmount !== undefined) {
    const fixedAmount = validateNumber(body.fixedAmount, {
      min: 0.01,
      max: 100000,
    });
    if (!fixedAmount.valid) {
      errors.push(`Fixed amount: ${fixedAmount.error}`);
    } else {
      sanitized.fixedAmount = fixedAmount.value;
    }
  }

  // Fixed ratio validation
  if (body.fixedRatio !== undefined) {
    const fixedRatio = validateNumber(body.fixedRatio, { min: 0.01, max: 10 });
    if (!fixedRatio.valid) {
      errors.push(`Fixed ratio: ${fixedRatio.error}`);
    } else {
      sanitized.fixedRatio = fixedRatio.value;
    }
  }

  // Risk management settings
  if (body.maxDailyLoss !== undefined) {
    const maxLoss = validateNumber(body.maxDailyLoss, { min: 0, max: 100 });
    if (!maxLoss.valid) {
      errors.push(`Max daily loss: ${maxLoss.error}`);
    } else {
      sanitized.maxDailyLoss = maxLoss.value;
    }
  }

  if (body.maxPositionSize !== undefined) {
    const maxPos = validateNumber(body.maxPositionSize, { min: 0, max: 100 });
    if (!maxPos.valid) {
      errors.push(`Max position size: ${maxPos.error}`);
    } else {
      sanitized.maxPositionSize = maxPos.value;
    }
  }

  if (body.stopLossPercent !== undefined) {
    const stopLoss = validateNumber(body.stopLossPercent, { min: 0, max: 100 });
    if (!stopLoss.valid) {
      errors.push(`Stop loss: ${stopLoss.error}`);
    } else {
      sanitized.stopLossPercent = stopLoss.value;
    }
  }

  if (body.takeProfitPercent !== undefined) {
    const takeProfit = validateNumber(body.takeProfitPercent, {
      min: 0,
      max: 1000,
    });
    if (!takeProfit.valid) {
      errors.push(`Take profit: ${takeProfit.error}`);
    } else {
      sanitized.takeProfitPercent = takeProfit.value;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate leader profile update
 */
export function validateLeaderUpdate(body: any): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  // Display name validation (optional)
  if (body.displayName !== undefined) {
    if (typeof body.displayName !== "string") {
      errors.push("Display name must be a string");
    } else {
      const displayName = sanitizeString(body.displayName, 100);
      if (displayName.length < 2) {
        errors.push("Display name must be at least 2 characters");
      } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(displayName)) {
        errors.push(
          "Display name can only contain letters, numbers, spaces, hyphens, and underscores"
        );
      } else {
        sanitized.displayName = displayName;
      }
    }
  }

  // Bio validation (optional)
  if (body.bio !== undefined) {
    sanitized.bio = sanitizeString(body.bio, 1000);
  }

  // Trading style validation (optional)
  if (body.tradingStyle !== undefined) {
    const validTradingStyles = ["SCALPING", "DAY_TRADING", "SWING", "POSITION"];
    if (!validTradingStyles.includes(body.tradingStyle)) {
      errors.push(
        `Trading style must be one of: ${validTradingStyles.join(", ")}`
      );
    } else {
      sanitized.tradingStyle = body.tradingStyle;
    }
  }

  // Risk level validation (optional)
  if (body.riskLevel !== undefined) {
    const validRiskLevels = ["LOW", "MEDIUM", "HIGH"];
    if (!validRiskLevels.includes(body.riskLevel)) {
      errors.push(`Risk level must be one of: ${validRiskLevels.join(", ")}`);
    } else {
      sanitized.riskLevel = body.riskLevel;
    }
  }

  // Profit share validation (optional)
  if (body.profitSharePercent !== undefined) {
    const profitShare = validateNumber(body.profitSharePercent, {
      min: 0,
      max: 50,
    });
    if (!profitShare.valid) {
      errors.push(`Profit share: ${profitShare.error}`);
    } else {
      sanitized.profitSharePercent = profitShare.value;
    }
  }

  // Minimum follow amount validation (optional)
  if (body.minFollowAmount !== undefined) {
    const minAmount = validateNumber(body.minFollowAmount, {
      min: 0,
      max: 1000000,
    });
    if (!minAmount.valid) {
      errors.push(`Minimum follow amount: ${minAmount.error}`);
    } else {
      sanitized.minFollowAmount = minAmount.value;
    }
  }

  // Max followers validation (optional)
  if (body.maxFollowers !== undefined) {
    const maxFollowers = validateNumber(body.maxFollowers, {
      min: 1,
      max: 10000,
    });
    if (!maxFollowers.valid) {
      errors.push(`Max followers: ${maxFollowers.error}`);
    } else {
      sanitized.maxFollowers = maxFollowers.value;
    }
  }

  // Is public validation (optional)
  if (body.isPublic !== undefined) {
    sanitized.isPublic = Boolean(body.isPublic);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(query: any): {
  page: number;
  limit: number;
  offset: number;
} {
  let page = parseInt(query.page || "1", 10);
  let limit = parseInt(query.limit || "20", 10);

  // Enforce reasonable limits
  page = Math.max(1, Math.min(page, 1000));
  limit = Math.max(1, Math.min(limit, 100));

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

/**
 * Validate sort parameters
 */
export function validateSort(
  query: any,
  allowedFields: string[]
): { sortBy: string; sortOrder: "ASC" | "DESC" } {
  let sortBy = query.sortBy || allowedFields[0];
  let sortOrder = (query.sortOrder || "DESC").toUpperCase();

  // Validate sort field
  if (!allowedFields.includes(sortBy)) {
    sortBy = allowedFields[0];
  }

  // Validate sort order
  if (!["ASC", "DESC"].includes(sortOrder)) {
    sortOrder = "DESC";
  }

  return { sortBy, sortOrder: sortOrder as "ASC" | "DESC" };
}

/**
 * Check if user already has active allocation on this market from another leader
 * Prevents conflicting trades on the same market from different leaders
 */
export async function checkMarketConflict(
  userId: string,
  leaderId: string,
  symbols: string[]
): Promise<{ hasConflict: boolean; conflictDetails?: any }> {
  const { models } = await import("@b/db");
  const { Op } = await import("sequelize");

  // Get all user's active subscriptions (excluding current leader)
  const activeSubscriptions = await models.copyTradingFollower.findAll({
    where: {
      userId,
      leaderId: { [Op.ne]: leaderId }, // Different leader
      status: { [Op.in]: ["ACTIVE", "PAUSED"] },
    },
    include: [
      {
        model: models.copyTradingFollowerAllocation,
        as: "allocations",
        where: {
          symbol: { [Op.in]: symbols },
          isActive: true,
        },
        required: false,
      },
      {
        model: models.copyTradingLeader,
        as: "leader",
        attributes: ["displayName"],
      },
    ],
  });

  const conflicts: Array<{ leaderName: string; markets: string[] }> = [];
  for (const sub of activeSubscriptions as any[]) {
    if (sub.allocations && sub.allocations.length > 0) {
      conflicts.push({
        leaderName: sub.leader.displayName,
        markets: sub.allocations.map((a: any) => a.symbol),
      });
    }
  }

  if (conflicts.length > 0) {
    return {
      hasConflict: true,
      conflictDetails: conflicts,
    };
  }

  return { hasConflict: false };
}

/**
 * Helper to throw validation error
 */
export function throwValidationError(result: ValidationResult): never {
  throw createError({
    statusCode: 400,
    message: result.errors.join("; "),
  });
}
