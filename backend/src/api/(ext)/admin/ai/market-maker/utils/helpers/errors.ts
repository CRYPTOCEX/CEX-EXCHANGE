/**
 * Standardized error messages for AI Market Maker
 * Provides consistent, user-friendly error messages across all endpoints
 */

export const AIMarketMakerErrors = {
  // Entity not found errors
  NOT_FOUND: (id: string) => `AI Market Maker with ID ${id} not found`,
  POOL_NOT_FOUND: (marketMakerId: string) =>
    `Pool not found for market maker ${marketMakerId}`,
  BOT_NOT_FOUND: (botId: string) => `Bot with ID ${botId} not found`,
  MARKET_NOT_FOUND: (marketId: string) =>
    `Ecosystem market with ID ${marketId} not found`,

  // Validation errors
  INVALID_PRICE_RANGE: () =>
    "Price range low must be less than price range high",
  TARGET_PRICE_OUT_OF_RANGE: () =>
    "Target price must be within the specified price range",
  INVALID_AMOUNT: (field: string) =>
    `${field} must be a positive number`,
  INVALID_PERCENTAGE: (field: string) =>
    `${field} must be between 0 and 100`,

  // Balance errors
  INSUFFICIENT_BALANCE: (
    available: number,
    requested: number,
    currency: string
  ) =>
    `Insufficient ${currency} balance. Available: ${available.toFixed(8)}, Requested: ${requested.toFixed(8)}`,
  INSUFFICIENT_POOL_BALANCE: (
    available: number,
    requested: number,
    currency: string
  ) =>
    `Insufficient pool ${currency} balance. Available: ${available.toFixed(8)}, Requested: ${requested.toFixed(8)}`,

  // Status errors
  MARKET_ACTIVE: (action: string) =>
    `Cannot ${action} while market maker is active. Please stop the market maker first.`,
  MARKET_NOT_ACTIVE: () =>
    "Market maker is not active",
  MARKET_ALREADY_EXISTS: (marketId: string) =>
    `An AI Market Maker already exists for market ${marketId}`,

  // Bot errors
  MIN_BOTS_REQUIRED: (required: number, current: number) =>
    `At least ${required} bots are required, currently have ${current}`,
  BOT_LIMIT_REACHED: (max: number) =>
    `Maximum number of bots (${max}) reached for this market maker`,
  BOT_DAILY_LIMIT: (botName: string) =>
    `Bot "${botName}" has reached its daily trade limit`,

  // Engine errors
  ENGINE_NOT_RUNNING: () =>
    "AI Market Maker engine is not running",
  ENGINE_START_FAILED: (reason: string) =>
    `Failed to start market maker engine: ${reason}`,
  ENGINE_STOP_FAILED: (reason: string) =>
    `Failed to stop market maker engine: ${reason}`,

  // Order errors
  ORDER_CANCELLATION_FAILED: (orderId: string) =>
    `Failed to cancel order ${orderId}`,
  ORDER_PLACEMENT_FAILED: (reason: string) =>
    `Failed to place order: ${reason}`,

  // Config errors
  INVALID_CONFIG: (field: string, reason: string) =>
    `Invalid configuration for ${field}: ${reason}`,

  // Generic errors
  OPERATION_FAILED: (operation: string, reason: string) =>
    `${operation} failed: ${reason}`,
  INTERNAL_ERROR: () =>
    "An internal error occurred. Please try again later.",
} as const;

/**
 * Create a standardized error response object
 */
export function createErrorResponse(
  message: string,
  code?: string,
  details?: Record<string, unknown>
) {
  return {
    error: true,
    message,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * HTTP status codes for common AI Market Maker errors
 */
export const AIMarketMakerHttpStatus = {
  NOT_FOUND: 404,
  INVALID_REQUEST: 400,
  INSUFFICIENT_BALANCE: 402,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;
