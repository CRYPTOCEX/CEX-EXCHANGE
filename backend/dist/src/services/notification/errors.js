"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoContactMethodError = exports.TemplateRenderError = exports.RedisCacheError = exports.InvalidConfigError = exports.InvalidAmountError = exports.RateLimitError = exports.QuietHoursError = exports.DuplicateNotificationError = exports.UserNotFoundError = exports.ProviderError = exports.TemplateNotFoundError = exports.ChannelNotAvailableError = exports.NotificationError = void 0;
class NotificationError extends Error {
    constructor(message) {
        super(message);
        this.name = "NotificationError";
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.NotificationError = NotificationError;
class ChannelNotAvailableError extends NotificationError {
    constructor(channel) {
        super(`Notification channel not available: ${channel}`);
        this.name = "ChannelNotAvailableError";
        this.channel = channel;
    }
}
exports.ChannelNotAvailableError = ChannelNotAvailableError;
class TemplateNotFoundError extends NotificationError {
    constructor(templateName) {
        super(`Notification template not found: ${templateName}`);
        this.name = "TemplateNotFoundError";
        this.templateName = templateName;
    }
}
exports.TemplateNotFoundError = TemplateNotFoundError;
class ProviderError extends NotificationError {
    constructor(provider, originalError) {
        super(`Provider ${provider} failed: ${originalError.message}`);
        this.name = "ProviderError";
        this.provider = provider;
        this.originalError = originalError;
    }
}
exports.ProviderError = ProviderError;
class UserNotFoundError extends NotificationError {
    constructor(userId) {
        super(`User not found: ${userId}`);
        this.name = "UserNotFoundError";
        this.userId = userId;
    }
}
exports.UserNotFoundError = UserNotFoundError;
class DuplicateNotificationError extends NotificationError {
    constructor(idempotencyKey, existingNotificationId) {
        super(`Duplicate notification detected: ${idempotencyKey} (existing: ${existingNotificationId})`);
        this.name = "DuplicateNotificationError";
        this.idempotencyKey = idempotencyKey;
        this.existingNotificationId = existingNotificationId;
    }
}
exports.DuplicateNotificationError = DuplicateNotificationError;
class QuietHoursError extends NotificationError {
    constructor(userId) {
        super(`User ${userId} is in quiet hours`);
        this.name = "QuietHoursError";
        this.userId = userId;
    }
}
exports.QuietHoursError = QuietHoursError;
class RateLimitError extends NotificationError {
    constructor(channel, retryAfter) {
        super(`Rate limit exceeded for ${channel}. Retry after ${retryAfter} seconds`);
        this.name = "RateLimitError";
        this.channel = channel;
        this.retryAfter = retryAfter;
    }
}
exports.RateLimitError = RateLimitError;
class InvalidAmountError extends NotificationError {
    constructor(amount, details) {
        super(`Invalid amount ${amount}: ${details}`);
        this.name = "InvalidAmountError";
        this.amount = amount;
    }
}
exports.InvalidAmountError = InvalidAmountError;
class InvalidConfigError extends NotificationError {
    constructor(configKey, details) {
        super(`Invalid configuration for ${configKey}: ${details}`);
        this.name = "InvalidConfigError";
        this.configKey = configKey;
    }
}
exports.InvalidConfigError = InvalidConfigError;
class RedisCacheError extends NotificationError {
    constructor(operation, originalError) {
        super(`Redis cache operation failed (${operation}): ${originalError.message}`);
        this.name = "RedisCacheError";
    }
}
exports.RedisCacheError = RedisCacheError;
class TemplateRenderError extends NotificationError {
    constructor(templateName, details) {
        super(`Template rendering failed for ${templateName}: ${details}`);
        this.name = "TemplateRenderError";
        this.templateName = templateName;
    }
}
exports.TemplateRenderError = TemplateRenderError;
class NoContactMethodError extends NotificationError {
    constructor(userId, channel) {
        super(`User ${userId} has no valid contact method for channel ${channel}`);
        this.name = "NoContactMethodError";
        this.userId = userId;
        this.channel = channel;
    }
}
exports.NoContactMethodError = NoContactMethodError;
