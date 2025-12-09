/**
 * AI Market Maker Security Tests
 *
 * Tests for input validation, authorization, rate limiting, and security best practices
 */

describe("Input Validation Security", () => {
  describe("Market Configuration Validation", () => {
    function validateMarketConfig(config: any): {
      valid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      // Required fields
      if (!config.marketId) {
        errors.push("marketId is required");
      }

      // UUID validation
      if (config.marketId && !isValidUUID(config.marketId)) {
        errors.push("marketId must be a valid UUID");
      }

      // Price validation
      if (config.targetPrice !== undefined) {
        if (typeof config.targetPrice !== "number" || isNaN(config.targetPrice)) {
          errors.push("targetPrice must be a valid number");
        }
        if (config.targetPrice < 0) {
          errors.push("targetPrice cannot be negative");
        }
        if (config.targetPrice > Number.MAX_SAFE_INTEGER) {
          errors.push("targetPrice exceeds maximum safe value");
        }
      }

      // Percentage validation
      if (config.realLiquidityPercent !== undefined) {
        if (
          typeof config.realLiquidityPercent !== "number" ||
          isNaN(config.realLiquidityPercent)
        ) {
          errors.push("realLiquidityPercent must be a valid number");
        }
        if (config.realLiquidityPercent < 0 || config.realLiquidityPercent > 100) {
          errors.push("realLiquidityPercent must be between 0 and 100");
        }
      }

      // Volatility threshold validation
      if (config.volatilityThreshold !== undefined) {
        if (
          typeof config.volatilityThreshold !== "number" ||
          isNaN(config.volatilityThreshold)
        ) {
          errors.push("volatilityThreshold must be a valid number");
        }
        if (config.volatilityThreshold < 0 || config.volatilityThreshold > 100) {
          errors.push("volatilityThreshold must be between 0 and 100");
        }
      }

      // Status validation
      if (config.status !== undefined) {
        const validStatuses = ["ACTIVE", "PAUSED", "STOPPED"];
        if (!validStatuses.includes(config.status)) {
          errors.push("status must be ACTIVE, PAUSED, or STOPPED");
        }
      }

      // Aggression level validation
      if (config.aggressionLevel !== undefined) {
        const validLevels = ["CONSERVATIVE", "MODERATE", "AGGRESSIVE"];
        if (!validLevels.includes(config.aggressionLevel)) {
          errors.push("aggressionLevel must be CONSERVATIVE, MODERATE, or AGGRESSIVE");
        }
      }

      return { valid: errors.length === 0, errors };
    }

    function isValidUUID(str: string): boolean {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    }

    test("should reject missing required fields", () => {
      const result = validateMarketConfig({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("marketId is required");
    });

    test("should reject invalid UUID", () => {
      const result = validateMarketConfig({ marketId: "not-a-uuid" });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("marketId must be a valid UUID");
    });

    test("should accept valid UUID", () => {
      const result = validateMarketConfig({
        marketId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.valid).toBe(true);
    });

    test("should reject negative price", () => {
      const result = validateMarketConfig({
        marketId: "123e4567-e89b-12d3-a456-426614174000",
        targetPrice: -100,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("targetPrice cannot be negative");
    });

    test("should reject NaN price", () => {
      const result = validateMarketConfig({
        marketId: "123e4567-e89b-12d3-a456-426614174000",
        targetPrice: NaN,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("targetPrice must be a valid number");
    });

    test("should reject percentage outside 0-100 range", () => {
      const result = validateMarketConfig({
        marketId: "123e4567-e89b-12d3-a456-426614174000",
        realLiquidityPercent: 150,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "realLiquidityPercent must be between 0 and 100"
      );
    });

    test("should reject invalid status", () => {
      const result = validateMarketConfig({
        marketId: "123e4567-e89b-12d3-a456-426614174000",
        status: "INVALID",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("status must be ACTIVE, PAUSED, or STOPPED");
    });

    test("should accept valid configuration", () => {
      const result = validateMarketConfig({
        marketId: "123e4567-e89b-12d3-a456-426614174000",
        targetPrice: 100.5,
        realLiquidityPercent: 50,
        status: "ACTIVE",
        aggressionLevel: "MODERATE",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Bot Configuration Validation", () => {
    function validateBotConfig(config: any): { valid: boolean; errors: string[] } {
      const errors: string[] = [];

      // Required fields
      if (!config.marketMakerId) {
        errors.push("marketMakerId is required");
      }
      if (!config.name) {
        errors.push("name is required");
      }

      // Name length validation
      if (config.name && config.name.length > 100) {
        errors.push("name must be 100 characters or less");
      }

      // Sanitize name for XSS
      if (config.name && /<script|javascript:|on\w+=/i.test(config.name)) {
        errors.push("name contains potentially malicious content");
      }

      // Personality validation
      if (config.personality) {
        const validPersonalities = [
          "SCALPER",
          "SWING",
          "ACCUMULATOR",
          "DISTRIBUTOR",
          "MARKET_MAKER",
        ];
        if (!validPersonalities.includes(config.personality)) {
          errors.push("Invalid personality type");
        }
      }

      // Risk tolerance validation
      if (config.riskTolerance !== undefined) {
        if (config.riskTolerance < 0.1 || config.riskTolerance > 1.0) {
          errors.push("riskTolerance must be between 0.1 and 1.0");
        }
      }

      // Order size validation
      if (config.avgOrderSize !== undefined) {
        if (config.avgOrderSize <= 0) {
          errors.push("avgOrderSize must be positive");
        }
      }

      // Max daily trades validation
      if (config.maxDailyTrades !== undefined) {
        if (!Number.isInteger(config.maxDailyTrades) || config.maxDailyTrades < 1) {
          errors.push("maxDailyTrades must be a positive integer");
        }
      }

      return { valid: errors.length === 0, errors };
    }

    test("should reject missing required fields", () => {
      const result = validateBotConfig({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("marketMakerId is required");
      expect(result.errors).toContain("name is required");
    });

    test("should reject long names", () => {
      const result = validateBotConfig({
        marketMakerId: "123e4567-e89b-12d3-a456-426614174000",
        name: "a".repeat(101),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("name must be 100 characters or less");
    });

    test("should reject XSS attempts in name", () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img onerror="alert(1)">',
        '<a onclick="alert(1)">',
      ];

      for (const xss of xssAttempts) {
        const result = validateBotConfig({
          marketMakerId: "123e4567-e89b-12d3-a456-426614174000",
          name: xss,
        });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain("name contains potentially malicious content");
      }
    });

    test("should reject invalid risk tolerance", () => {
      const result = validateBotConfig({
        marketMakerId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Bot",
        riskTolerance: 1.5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "riskTolerance must be between 0.1 and 1.0"
      );
    });

    test("should reject non-positive order size", () => {
      const result = validateBotConfig({
        marketMakerId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Bot",
        avgOrderSize: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("avgOrderSize must be positive");
    });

    test("should accept valid bot configuration", () => {
      const result = validateBotConfig({
        marketMakerId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Scalper Bot 1",
        personality: "SCALPER",
        riskTolerance: 0.5,
        avgOrderSize: 1.5,
        maxDailyTrades: 100,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("SQL Injection Prevention", () => {
    function sanitizeForDb(input: string): string {
      // Escape single quotes
      return input.replace(/'/g, "''");
    }

    function detectSqlInjection(input: string): boolean {
      const sqlPatterns = [
        /('|")?OR\s+'?\d+'?\s*=\s*'?\d+'?/i,
        /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER)/i,
        /UNION\s+(ALL\s+)?SELECT/i,
        /--/,
        /\/\*.*\*\//,
        /'\s*OR\s*'.*'\s*=\s*'/i,
      ];

      return sqlPatterns.some((pattern) => pattern.test(input));
    }

    test("should detect basic SQL injection", () => {
      const injections = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "1; DELETE FROM ai_market_maker;",
        "' OR 1=1 --",
        "/* comment */ DROP TABLE",
      ];

      for (const injection of injections) {
        expect(detectSqlInjection(injection)).toBe(true);
      }
    });

    test("should not flag legitimate inputs", () => {
      const legitimate = [
        "Market Maker Bot 1",
        "BTC/USDT Trading",
        "High-Frequency Scalper",
        "O'Brien's Bot",
      ];

      for (const input of legitimate) {
        expect(detectSqlInjection(input)).toBe(false);
      }
    });

    test("should properly escape single quotes", () => {
      const input = "O'Brien's Bot";
      const sanitized = sanitizeForDb(input);
      expect(sanitized).toBe("O''Brien''s Bot");
    });
  });
});

describe("Authorization Security", () => {
  // Mock permission checking
  interface User {
    id: string;
    role: "admin" | "user" | "viewer";
    permissions: string[];
  }

  function checkPermission(user: User, requiredPermission: string): boolean {
    if (user.role === "admin") return true;
    return user.permissions.includes(requiredPermission);
  }

  function checkMarketAccess(user: User, marketId: string): boolean {
    // Admin has access to all
    if (user.role === "admin") return true;

    // Other users need specific permission
    return checkPermission(user, `market:${marketId}:access`);
  }

  describe("Role-Based Access Control", () => {
    const adminUser: User = {
      id: "admin-1",
      role: "admin",
      permissions: [],
    };

    const regularUser: User = {
      id: "user-1",
      role: "user",
      permissions: ["Access AI Market Maker Management"],
    };

    const viewerUser: User = {
      id: "viewer-1",
      role: "viewer",
      permissions: [],
    };

    test("admin should have access to all operations", () => {
      expect(checkPermission(adminUser, "Access AI Market Maker Management")).toBe(true);
      expect(checkPermission(adminUser, "Modify AI Settings")).toBe(true);
      expect(checkPermission(adminUser, "Delete AI Market")).toBe(true);
    });

    test("regular user should only have assigned permissions", () => {
      expect(checkPermission(regularUser, "Access AI Market Maker Management")).toBe(
        true
      );
      expect(checkPermission(regularUser, "Delete AI Market")).toBe(false);
    });

    test("viewer should have no management permissions", () => {
      expect(
        checkPermission(viewerUser, "Access AI Market Maker Management")
      ).toBe(false);
      expect(checkPermission(viewerUser, "Modify AI Settings")).toBe(false);
    });
  });

  describe("Resource-Level Access Control", () => {
    const adminUser: User = {
      id: "admin-1",
      role: "admin",
      permissions: [],
    };

    const limitedUser: User = {
      id: "user-1",
      role: "user",
      permissions: ["market:market-1:access", "market:market-2:access"],
    };

    test("admin should access any market", () => {
      expect(checkMarketAccess(adminUser, "market-1")).toBe(true);
      expect(checkMarketAccess(adminUser, "market-999")).toBe(true);
    });

    test("limited user should only access assigned markets", () => {
      expect(checkMarketAccess(limitedUser, "market-1")).toBe(true);
      expect(checkMarketAccess(limitedUser, "market-2")).toBe(true);
      expect(checkMarketAccess(limitedUser, "market-3")).toBe(false);
    });
  });
});

describe("Rate Limiting Security", () => {
  // Simple in-memory rate limiter
  class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private windowMs: number;
    private maxRequests: number;

    constructor(windowMs: number, maxRequests: number) {
      this.windowMs = windowMs;
      this.maxRequests = maxRequests;
    }

    check(identifier: string): { allowed: boolean; remainingRequests: number } {
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Get existing requests for this identifier
      let requests = this.requests.get(identifier) || [];

      // Filter to only requests in current window
      requests = requests.filter((time) => time > windowStart);

      // Check if limit exceeded
      if (requests.length >= this.maxRequests) {
        return {
          allowed: false,
          remainingRequests: 0,
        };
      }

      // Add this request
      requests.push(now);
      this.requests.set(identifier, requests);

      return {
        allowed: true,
        remainingRequests: this.maxRequests - requests.length,
      };
    }

    reset(identifier: string): void {
      this.requests.delete(identifier);
    }
  }

  describe("API Rate Limiting", () => {
    test("should allow requests within limit", () => {
      const limiter = new RateLimiter(60000, 100); // 100 requests per minute

      for (let i = 0; i < 50; i++) {
        const result = limiter.check("user-1");
        expect(result.allowed).toBe(true);
        expect(result.remainingRequests).toBe(100 - i - 1);
      }
    });

    test("should block requests exceeding limit", () => {
      const limiter = new RateLimiter(60000, 10); // 10 requests per minute

      // Make 10 allowed requests
      for (let i = 0; i < 10; i++) {
        const result = limiter.check("user-1");
        expect(result.allowed).toBe(true);
      }

      // 11th request should be blocked
      const result = limiter.check("user-1");
      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
    });

    test("should track limits per user independently", () => {
      const limiter = new RateLimiter(60000, 5);

      // User 1 exhausts their limit
      for (let i = 0; i < 5; i++) {
        limiter.check("user-1");
      }

      // User 1 blocked
      expect(limiter.check("user-1").allowed).toBe(false);

      // User 2 still has their limit
      expect(limiter.check("user-2").allowed).toBe(true);
    });

    test("should reset after time window", async () => {
      const limiter = new RateLimiter(100, 2); // 2 requests per 100ms

      // Exhaust limit
      limiter.check("user-1");
      limiter.check("user-1");
      expect(limiter.check("user-1").allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      expect(limiter.check("user-1").allowed).toBe(true);
    });
  });

  describe("Trading Rate Limits", () => {
    test("should limit trade execution rate", () => {
      const tradeLimiter = new RateLimiter(1000, 5); // 5 trades per second

      let executed = 0;
      for (let i = 0; i < 10; i++) {
        if (tradeLimiter.check("market-1").allowed) {
          executed++;
        }
      }

      expect(executed).toBe(5);
    });

    test("should limit API calls per bot", () => {
      const botLimiter = new RateLimiter(60000, 100); // 100 API calls per minute per bot

      let allowed = 0;
      for (let i = 0; i < 150; i++) {
        if (botLimiter.check("bot-1").allowed) {
          allowed++;
        }
      }

      expect(allowed).toBe(100);
    });
  });
});

describe("Data Protection Security", () => {
  describe("Sensitive Data Handling", () => {
    interface AuditLog {
      action: string;
      userId: string;
      timestamp: number;
      details: Record<string, any>;
    }

    function sanitizeForLog(data: Record<string, any>): Record<string, any> {
      const sensitiveFields = [
        "password",
        "token",
        "apiKey",
        "secret",
        "privateKey",
      ];
      const sanitized = { ...data };

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = "[REDACTED]";
        }
      }

      return sanitized;
    }

    function createAuditLog(
      action: string,
      userId: string,
      details: Record<string, any>
    ): AuditLog {
      return {
        action,
        userId,
        timestamp: Date.now(),
        details: sanitizeForLog(details),
      };
    }

    test("should redact sensitive fields in logs", () => {
      const log = createAuditLog("UPDATE_SETTINGS", "admin-1", {
        tradingEnabled: true,
        apiKey: "secret-api-key-12345",
        password: "admin123",
      });

      expect(log.details.tradingEnabled).toBe(true);
      expect(log.details.apiKey).toBe("[REDACTED]");
      expect(log.details.password).toBe("[REDACTED]");
    });

    test("should not redact non-sensitive fields", () => {
      const log = createAuditLog("CREATE_MARKET", "admin-1", {
        marketId: "123e4567-e89b-12d3-a456-426614174000",
        targetPrice: 100,
        status: "ACTIVE",
      });

      expect(log.details.marketId).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(log.details.targetPrice).toBe(100);
      expect(log.details.status).toBe("ACTIVE");
    });
  });

  describe("Data Encryption", () => {
    // Simple encryption simulation (in production use proper crypto)
    function encrypt(data: string, key: string): string {
      // XOR-based simple encryption (NOT secure, just for demo)
      let result = "";
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return Buffer.from(result).toString("base64");
    }

    function decrypt(encrypted: string, key: string): string {
      const data = Buffer.from(encrypted, "base64").toString();
      let result = "";
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      return result;
    }

    test("should encrypt and decrypt data", () => {
      const original = "sensitive-data-12345";
      const key = "encryption-key";

      const encrypted = encrypt(original, key);
      expect(encrypted).not.toBe(original);

      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(original);
    });

    test("encrypted data should not reveal original", () => {
      const original = "api-secret-key";
      const key = "encryption-key";

      const encrypted = encrypt(original, key);

      // Encrypted should not contain original
      expect(encrypted).not.toContain("api");
      expect(encrypted).not.toContain("secret");
    });
  });
});

describe("Input Sanitization", () => {
  function sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function sanitizeJson(input: any): any {
    if (typeof input === "string") {
      return sanitizeHtml(input);
    }
    if (Array.isArray(input)) {
      return input.map(sanitizeJson);
    }
    if (typeof input === "object" && input !== null) {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[sanitizeHtml(key)] = sanitizeJson(value);
      }
      return sanitized;
    }
    return input;
  }

  test("should escape HTML special characters", () => {
    const input = '<script>alert("xss")</script>';
    const sanitized = sanitizeHtml(input);

    expect(sanitized).not.toContain("<script>");
    expect(sanitized).toContain("&lt;script&gt;");
  });

  test("should sanitize nested objects", () => {
    const input = {
      name: '<img onerror="alert(1)">',
      details: {
        description: "Normal text",
        code: "<b>bold</b>",
      },
    };

    const sanitized = sanitizeJson(input);

    expect(sanitized.name).toContain("&lt;img");
    expect(sanitized.details.description).toBe("Normal text");
    expect(sanitized.details.code).toContain("&lt;b&gt;");
  });

  test("should handle arrays", () => {
    const input = ["<script>", "normal", "<b>test</b>"];
    const sanitized = sanitizeJson(input);

    expect(sanitized[0]).toContain("&lt;script&gt;");
    expect(sanitized[1]).toBe("normal");
    expect(sanitized[2]).toContain("&lt;b&gt;");
  });
});

describe("Error Handling Security", () => {
  function safeErrorMessage(error: Error, isProduction: boolean): string {
    if (isProduction) {
      // Don't expose internal details in production
      return "An error occurred. Please try again later.";
    }
    // In development, show full error
    return error.message;
  }

  function sanitizeStackTrace(error: Error): string {
    // Remove file paths from stack trace
    return (
      error.stack?.replace(/\(.*?node_modules.*?\)/g, "(internal)") ||
      "No stack trace"
    );
  }

  test("should hide error details in production", () => {
    const error = new Error("Database connection failed: password incorrect");

    const prodMessage = safeErrorMessage(error, true);
    const devMessage = safeErrorMessage(error, false);

    expect(prodMessage).not.toContain("password");
    expect(devMessage).toContain("password");
  });

  test("should sanitize stack traces", () => {
    const error = new Error("Test error");
    // Simulate a stack trace with file paths
    error.stack = `Error: Test error
      at function1 (/home/user/project/node_modules/package/file.js:10:5)
      at function2 (/home/user/project/src/index.js:20:10)`;

    const sanitized = sanitizeStackTrace(error);

    expect(sanitized).not.toContain("/home/user");
    expect(sanitized).toContain("(internal)");
  });
});
