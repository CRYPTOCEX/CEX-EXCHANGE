import { RedisSingleton } from "../utils/redis";
import {
  generateTokens,
  refreshTokens,
  verifyAccessToken,
  verifyRefreshToken,
} from "@b/utils/token";
import { Response } from "./Response";
import { Request } from "./Request";
import { MashServer } from "..";
import logger, { logError } from "@b/utils/logger";
import { models } from "@b/db";

const isDemo: boolean = process.env.NEXT_PUBLIC_DEMO_STATUS === "true";
const isMaintenance: boolean =
  process.env.NEXT_PUBLIC_MAINTENANCE_STATUS === "true";
const AUTH_PAGES: string[] = ["/logout"];

const PERMISSION_MAP: Record<string, string[]> = {
  trade: ["/api/exchange/order", "/api/ecosystem/order"],
  futures: ["/api/futures"],
  deposit: ["/api/finance/deposit"],
  withdraw: ["/api/finance/withdraw"],
  transfer: ["/api/finance/transfer"],
  payment: ["/api/payment/intent"],
  // NFT permissions
  "nft.admin": [
    "/api/nft/marketplace/deploy",
    "/api/nft/marketplace/config",
    "/api/nft/marketplace/pause",
    "/api/nft/marketplace/unpause",
    "/api/nft/marketplace/withdraw",
    "/api/nft/marketplace/whitelist",
    "/api/nft/marketplace/balance",
    "/api/admin/nft"
  ],
  "nft.create": ["/api/nft/token/mint", "/api/nft/collection"],
  "nft.trade": ["/api/nft/listing", "/api/nft/offer", "/api/nft/auction"],
};

// Define the NextFunction type for middleware chaining.
type NextFunction = () => void;

/**
 * Authenticate the request using either an API key or JWT.
 */
export async function authenticate(
  res: Response,
  req: Request,
  next: NextFunction
): Promise<void> {
  try {
    // Allow preflight requests immediately.
    if (req.method.toLowerCase() === "options") {
      return next();
    }

    // Check for required headers or cookies.
    if (
      (req.headers.platform && !req.headers.accesstoken) ||
      (!req.headers.platform && !req.cookies)
    ) {
      return res.handleError(401, "Authentication Required");
    }

    // Process API Key based authentication.
    const apiKey: string | undefined = req.headers["x-api-key"];
    if (apiKey) {
      try {
        const apiKeyRecord = await models.apiKey.findOne({
          where: { key: apiKey },
        });
        if (!apiKeyRecord) throw new Error("Invalid API Key");

        const userPermissions =
          typeof apiKeyRecord.permissions === "string"
            ? JSON.parse(apiKeyRecord.permissions)
            : apiKeyRecord.permissions;
        req.setUser({ id: apiKeyRecord.userId, permissions: userPermissions });
        return next(); // Skip further JWT checks.
      } catch (error: any) {
        logger(
          "error",
          "auth",
          __filename,
          `API Key Verification Error: ${error.message}`
        );
        return res.handleError(401, "Authentication Required");
      }
    }

    // Process JWT-based authentication.
    // For WebSocket connections, also check query params
    const accessToken: string | undefined =
      req.cookies.accessToken || 
      req.headers.accesstoken || 
      (req.query?.token as string);
    if (!accessToken) {
      return await attemptRefreshToken(res, req, next).catch((error: any) => {
        logger(
          "error",
          "auth",
          __filename,
          `JWT Verification Error: ${error.message}`
        );
        return res.handleError(401, "Authentication Required");
      });
    }

    const userPayload = await verifyAccessToken(accessToken);
    if (!userPayload) {
      return await attemptRefreshToken(res, req, next).catch((error: any) => {
        logger(
          "error",
          "auth",
          __filename,
          `JWT Verification Error: ${error.message}`
        );
        return res.handleError(401, "Authentication Required");
      });
    }

    if (!userPayload.sub || !userPayload.sub.id) {
      return res.handleError(401, "Authentication Required");
    }

    req.setUser(userPayload.sub);
    return await csrfCheck(res, req, next);
  } catch (error: any) {
    logger(
      "error",
      "auth",
      __filename,
      `Error in authentication: ${error.message}`
    );
    return res.handleError(500, error.message);
  }
}

/**
 * Attempt to refresh the token when access token verification fails.
 */
async function attemptRefreshToken(
  res: Response,
  req: Request,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId: string | undefined =
      req.cookies.sessionId || req.headers.sessionid;
    if (!sessionId) {
      return res.handleError(
        401,
        "Authentication Required: Missing session ID"
      );
    }

    const userSessionKey: string = `sessionId:${sessionId}`;
    const redisInstance = RedisSingleton.getInstance();
    const sessionData: string | null = await redisInstance.get(userSessionKey);
    if (!sessionData) {
      return res.handleError(401, "Authentication Required: Session not found");
    }

    const { refreshToken: storedRefreshToken, user } = JSON.parse(sessionData);
    if (!storedRefreshToken) {
      return res.handleError(
        401,
        "Authentication Required: No refresh token found"
      );
    }

    let newTokens;
    try {
      const decoded = await verifyRefreshToken(storedRefreshToken);
      if (
        !decoded ||
        !decoded.sub ||
        typeof decoded.sub !== "object" ||
        !decoded.sub.id
      ) {
        throw new Error("Invalid or malformed refresh token");
      }
      newTokens = await refreshTokens(decoded.sub, sessionId);
    } catch (error: any) {
      logger(
        "warn",
        "auth",
        __filename,
        `Refresh token validation failed: ${error.message}`
      );
      newTokens = await generateTokens(user);
    }

    // Update tokens and set user.
    req.updateTokens(newTokens);
    req.setUser(user);
    next();
  } catch (error: any) {
    logger(
      "error",
      "auth",
      __filename,
      `Token refresh error: ${error.message}`
    );
    return res.handleError(401, `Authentication Required: ${error.message}`);
  }
}

/**
 * Verifies API access for plugin-based requests.
 */
export async function handleApiVerification(
  res: Response,
  req: Request,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey: string | undefined = req.headers["x-api-key"];
    if (!apiKey) {
      return res.handleError(401, "API key is required");
    }

    const apiKeyRecord = await models.apiKey.findOne({
      where: { key: apiKey },
    });
    if (!apiKeyRecord) {
      return res.handleError(401, "Invalid API key");
    }

    const { type, permissions = [] } = apiKeyRecord;
    if (type !== "plugin") {
      return res.handleError(
        403,
        "Forbidden: Access restricted to plugin type"
      );
    }

    // Check if the route requires specific permissions.
    const routePermissions = Object.entries(PERMISSION_MAP).find(([, routes]) =>
      routes.some((route) => req.url.startsWith(route))
    );

    if (routePermissions) {
      const [requiredPermission] = routePermissions;
      if (!permissions.includes(requiredPermission)) {
        return res.handleError(403, "Forbidden: Permission denied");
      }
    }

    next();
  } catch (error: any) {
    logger(
      "error",
      "apiVerification",
      __filename,
      `API Verification Error: ${error.message}`
    );
    return res.handleError(500, "Internal Server Error");
  }
}

/**
 * Performs CSRF token validation for non-GET requests or routes that require CSRF protection.
 */
export async function csrfCheck(
  res: Response,
  req: Request,
  next: NextFunction
): Promise<void> {
  try {
    // Allow GET requests or those not in protected pages.
    if (req.method.toLowerCase() === "get" || !AUTH_PAGES.includes(req.url)) {
      return next();
    }

    const csrfToken: string | undefined =
      req.cookies.csrfToken || req.headers.csrftoken;
    const sessionId: string | undefined =
      req.cookies.sessionId || req.headers.sessionid;

    if (!csrfToken || !sessionId) {
      return res.handleError(403, "CSRF Token or Session ID missing");
    }

    const user = req.getUser();
    if (!user) {
      return res.handleError(401, "Authentication Required");
    }

    const userSessionKey: string = `sessionId:${user.id}:${sessionId}`;
    const sessionData: string | null =
      await RedisSingleton.getInstance().get(userSessionKey);
    if (!sessionData) {
      return res.handleError(403, "Invalid Session");
    }

    const { csrfToken: storedCSRFToken } = JSON.parse(sessionData);
    if (csrfToken !== storedCSRFToken) {
      return res.handleError(403, "Invalid CSRF Token");
    }

    next();
  } catch (error: any) {
    logger("error", "csrf", __filename, `CSRF Check Error: ${error.message}`);
    res.handleError(403, "CSRF Check Failed");
  }
}

/**
 * Implements rate limiting per IP address.
 */
export async function rateLimit(
  res: Response,
  req: Request,
  next: NextFunction
): Promise<void> {
  try {
    // Only rate limit methods that can modify state.
    if (
      !["post", "put", "patch", "delete"].includes(req.method.toLowerCase())
    ) {
      return next();
    }

    const clientIpBuffer: string | null = res.getRemoteAddressAsText();
    const clientIp: string = clientIpBuffer ? clientIpBuffer : "unknown";
    const userRateLimitKey: string = `rateLimit:${clientIp}`;
    const limit: number = parseInt(process.env.RATE_LIMIT || "100", 10);
    const expireTime: number = parseInt(
      process.env.RATE_LIMIT_EXPIRE || "60",
      10
    );

    const current: string | null =
      await RedisSingleton.getInstance().get(userRateLimitKey);
    if (current !== null && parseInt(current, 10) >= limit) {
      return res.handleError(429, "Rate Limit Exceeded, Try Again Later");
    }

    await RedisSingleton.getInstance()
      .multi()
      .incr(userRateLimitKey)
      .expire(userRateLimitKey, expireTime)
      .exec();

    next();
  } catch (error: any) {
    logger(
      "error",
      "rateLimit",
      __filename,
      `Rate Limiting Error: ${error.message}`
    );
    res.handleError(500, error.message);
  }
}

/**
 * Configurable rate limiter for specific endpoints
 */
export function createRateLimiter(
  options: {
    limit?: number;
    window?: number; // in seconds
    keyPrefix?: string;
    message?: string;
  } = {}
) {
  const {
    limit = 100,
    window = 60,
    keyPrefix = "rateLimit",
    message = "Rate Limit Exceeded, Try Again Later",
  } = options;

  return async (data: any) => {
    const { req, res, user } = data;
    
    // Determine the key based on user or IP
    let key: string;
    if (user?.id) {
      key = `${keyPrefix}:user:${user.id}`;
    } else {
      const clientIp = req?.ip || req?.connection?.remoteAddress || "unknown";
      key = `${keyPrefix}:ip:${clientIp}`;
    }

    const redis = RedisSingleton.getInstance();
    const current = await redis.get(key);
    
    if (current !== null && parseInt(current, 10) >= limit) {
      const ttl = await redis.ttl(key);
      throw {
        statusCode: 429,
        message,
        headers: {
          "Retry-After": ttl > 0 ? ttl.toString() : window.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      };
    }

    await redis
      .multi()
      .incr(key)
      .expire(key, window)
      .exec();
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  // Strict rate limit for sensitive operations
  strict: createRateLimiter({
    limit: 5,
    window: 900, // 15 minutes
    keyPrefix: "strict",
    message: "Too many attempts. Please try again in 15 minutes.",
  }),
  
  // Moderate rate limit
  moderate: createRateLimiter({
    limit: 30,
    window: 60,
    keyPrefix: "moderate",
    message: "Too many requests. Please slow down.",
  }),
  
  // Light rate limit
  light: createRateLimiter({
    limit: 100,
    window: 60,
    keyPrefix: "light",
    message: "Too many requests. Please try again shortly.",
  }),
  
  // General rate limit
  general: createRateLimiter({
    limit: 100,
    window: 60,
    keyPrefix: "general",
    message: "Too many requests. Please try again later.",
  }),
  
  // Order creation
  orderCreation: createRateLimiter({
    limit: 5,
    window: 900, // 15 minutes
    keyPrefix: "order_create",
    message: "Too many order attempts. Please wait before placing another order.",
  }),
  
  // Discount validation
  discountValidation: createRateLimiter({
    limit: 20,
    window: 60,
    keyPrefix: "discount_check",
    message: "Too many discount validation attempts. Please try again later.",
  }),
  
  // Download rate limit
  download: createRateLimiter({
    limit: 10,
    window: 3600, // 1 hour
    keyPrefix: "download",
    message: "Download limit exceeded. Please try again later.",
  }),
  
  // FAQ feedback
  faqFeedback: createRateLimiter({
    limit: 20,
    window: 3600, // 1 hour
    keyPrefix: "faq_feedback",
    message: "Too many feedback submissions. Please try again later.",
  }),
  
  // FAQ questions
  faqQuestion: createRateLimiter({
    limit: 5,
    window: 86400, // 24 hours
    keyPrefix: "faq_question",
    message: "You have reached the daily limit for questions. Please try again tomorrow.",
  }),
  
  // P2P specific limits
  p2pOfferCreate: createRateLimiter({
    limit: 5,
    window: 3600, // 1 hour
    keyPrefix: "p2p:offer:create",
    message: "Too many offers created. Please wait before creating another offer.",
  }),
  
  p2pTradeInitiate: createRateLimiter({
    limit: 20,
    window: 3600, // 1 hour
    keyPrefix: "p2p:trade:initiate",
    message: "Too many trade requests. Please wait before initiating another trade.",
  }),
  
  p2pTradeAction: createRateLimiter({
    limit: 50,
    window: 3600, // 1 hour
    keyPrefix: "p2p:trade:action",
    message: "Too many trade actions. Please slow down.",
  }),
  
  p2pMessage: createRateLimiter({
    limit: 100,
    window: 3600, // 1 hour
    keyPrefix: "p2p:message",
    message: "Too many messages sent. Please wait before sending more.",
  }),
  
  p2pDisputeCreate: createRateLimiter({
    limit: 3,
    window: 86400, // 24 hours
    keyPrefix: "p2p:dispute:create",
    message: "Too many disputes created. Please contact support if you need assistance.",
  }),
  
  p2pAdminDispute: createRateLimiter({
    limit: 100,
    window: 3600, // 1 hour
    keyPrefix: "p2p:admin:dispute",
    message: "Too many dispute management requests. Please wait.",
  }),
  
  p2pAdminOffer: createRateLimiter({
    limit: 50,
    window: 3600, // 1 hour
    keyPrefix: "p2p:admin:offer",
    message: "Too many offer management requests. Please wait.",
  }),
  
  p2pAdminTrade: createRateLimiter({
    limit: 100,
    window: 3600, // 1 hour
    keyPrefix: "p2p:admin:trade",
    message: "Too many trade management requests. Please wait.",
  }),
};

// Aliases for backward compatibility
export const strictRateLimit = rateLimiters.strict;
export const moderateRateLimit = rateLimiters.moderate;
export const lightRateLimit = rateLimiters.light;
export const faqFeedbackRateLimit = rateLimiters.faqFeedback;
export const faqQuestionRateLimit = rateLimiters.faqQuestion;
export const p2pAdminDisputeRateLimit = rateLimiters.p2pAdminDispute;
export const p2pAdminOfferRateLimit = rateLimiters.p2pAdminOffer;
export const p2pAdminTradeRateLimit = rateLimiters.p2pAdminTrade;

/**
 * Checks if the user is allowed to access the route based on role and permissions.
 */
export async function rolesGate(
  app: MashServer,
  res: Response,
  req: Request,
  routePath: string,
  method: string,
  next: NextFunction
): Promise<void> {
  try {
    const metadata = req.metadata;
    if (!metadata || !metadata.permission) {
      return next();
    }

    const user = req.getUser();
    if (!user) {
      return res.handleError(401, "Authentication Required");
    }

    // If API key is used, verify its permissions.
    if (req.headers["x-api-key"]) {
      const apiKey: string = req.headers["x-api-key"];
      const apiKeyRecord = await models.apiKey.findOne({
        where: { key: apiKey },
      });
      if (!apiKeyRecord) {
        return res.handleError(401, "Authentication Required");
      }
      const userPermissions =
        typeof apiKeyRecord.permissions === "string"
          ? JSON.parse(apiKeyRecord.permissions)
          : apiKeyRecord.permissions;
      for (const permission in PERMISSION_MAP) {
        if (
          PERMISSION_MAP[permission].some((route) =>
            routePath.startsWith(route)
          )
        ) {
          if (!userPermissions.includes(permission)) {
            return res.handleError(
              403,
              "Forbidden - You do not have permission to access this"
            );
          }
          break;
        }
      }
    }

    // Fallback to role-based authorization.
    const userRole = app.getRole(user.role);
    if (
      !userRole ||
      (!userRole.permissions.includes(metadata.permission) &&
        userRole.name !== "Super Admin")
    ) {
      return res.handleError(
        403,
        "Forbidden - You do not have permission to access this"
      );
    }

    // In demo mode, restrict admin routes for non-Super Admins.
    if (
      isDemo &&
      routePath.startsWith("/api/admin") &&
      ["post", "put", "delete", "del"].includes(method.toLowerCase()) &&
      userRole.name !== "Super Admin"
    ) {
      return res.handleError(403, "Action not allowed in demo mode");
    }

    next();
  } catch (error: any) {
    logger(
      "error",
      "rolesGate",
      __filename,
      `Roles Gate Error: ${error.message}`
    );
    res.handleError(500, error.message);
  }
}

/**
 * Checks if the current user has permission to access the site during maintenance.
 */
export async function siteMaintenanceAccessGate(
  app: MashServer,
  res: Response,
  req: Request,
  next: NextFunction
): Promise<void> {
  if (!isMaintenance) return next();

  try {
    const user = req.getUser();
    if (!user) {
      return res.handleError(401, "Authentication Required");
    }
    const userRole = app.getRole(user.role);
    const hasAccessAdmin =
      userRole &&
      (userRole.name === "Super Admin" ||
        (userRole.permissions &&
          userRole.permissions.includes("access.admin.dashboard")));

    if (!hasAccessAdmin) {
      return res.handleError(
        403,
        "Forbidden - You do not have permission to access this until maintenance is over"
      );
    }
    next();
  } catch (error: any) {
    logError("middleware", error, __filename);
    return res.handleError(500, error.message);
  }
}
