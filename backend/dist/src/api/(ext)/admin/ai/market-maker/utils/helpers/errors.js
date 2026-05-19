"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIMarketMakerHttpStatus = exports.AIMarketMakerErrors = void 0;
exports.createErrorResponse = createErrorResponse;
exports.AIMarketMakerErrors = {
    NOT_FOUND: (id) => `AI Market Maker with ID ${id} not found`,
    POOL_NOT_FOUND: (marketMakerId) => `Pool not found for market maker ${marketMakerId}`,
    BOT_NOT_FOUND: (botId) => `Bot with ID ${botId} not found`,
    MARKET_NOT_FOUND: (marketId) => `Ecosystem market with ID ${marketId} not found`,
    INVALID_PRICE_RANGE: () => "Price range low must be less than price range high",
    TARGET_PRICE_OUT_OF_RANGE: () => "Target price must be within the specified price range",
    INVALID_AMOUNT: (field) => `${field} must be a positive number`,
    INVALID_PERCENTAGE: (field) => `${field} must be between 0 and 100`,
    INSUFFICIENT_BALANCE: (available, requested, currency) => `Insufficient ${currency} balance. Available: ${available.toFixed(8)}, Requested: ${requested.toFixed(8)}`,
    INSUFFICIENT_POOL_BALANCE: (available, requested, currency) => `Insufficient pool ${currency} balance. Available: ${available.toFixed(8)}, Requested: ${requested.toFixed(8)}`,
    MARKET_ACTIVE: (action) => `Cannot ${action} while market maker is active. Please stop the market maker first.`,
    MARKET_NOT_ACTIVE: () => "Market maker is not active",
    MARKET_ALREADY_EXISTS: (marketId) => `An AI Market Maker already exists for market ${marketId}`,
    MIN_BOTS_REQUIRED: (required, current) => `At least ${required} bots are required, currently have ${current}`,
    BOT_LIMIT_REACHED: (max) => `Maximum number of bots (${max}) reached for this market maker`,
    BOT_DAILY_LIMIT: (botName) => `Bot "${botName}" has reached its daily trade limit`,
    ENGINE_NOT_RUNNING: () => "AI Market Maker engine is not running",
    ENGINE_START_FAILED: (reason) => `Failed to start market maker engine: ${reason}`,
    ENGINE_STOP_FAILED: (reason) => `Failed to stop market maker engine: ${reason}`,
    ORDER_CANCELLATION_FAILED: (orderId) => `Failed to cancel order ${orderId}`,
    ORDER_PLACEMENT_FAILED: (reason) => `Failed to place order: ${reason}`,
    INVALID_CONFIG: (field, reason) => `Invalid configuration for ${field}: ${reason}`,
    OPERATION_FAILED: (operation, reason) => `${operation} failed: ${reason}`,
    INTERNAL_ERROR: () => "An internal error occurred. Please try again later.",
};
function createErrorResponse(message, code, details) {
    return {
        error: true,
        message,
        code,
        details,
        timestamp: new Date().toISOString(),
    };
}
exports.AIMarketMakerHttpStatus = {
    NOT_FOUND: 404,
    INVALID_REQUEST: 400,
    INSUFFICIENT_BALANCE: 402,
    FORBIDDEN: 403,
    CONFLICT: 409,
    INTERNAL_ERROR: 500,
};
