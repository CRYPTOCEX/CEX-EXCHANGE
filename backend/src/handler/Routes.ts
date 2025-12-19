import fs from "fs/promises";
import path from "path";
import { Request, Response } from "..";
import {
  authenticate,
  handleApiVerification,
  rateLimit,
  rolesGate,
  siteMaintenanceAccessGate,
  rateLimiters,
} from "../handler/Middleware";
import { sanitizePath } from "@b/utils/validation";
import { isProduction } from "@b/utils/constants";
import { logger, withLogger, type ApiContext } from "@b/utils/console";
import { setupWebSocketEndpoint } from "./Websocket";
import { applyDemoMask } from "@b/utils/demoMask";

// Use .js extension in production, otherwise .ts for development.
const fileExtension: string = isProduction ? ".js" : ".ts";

// Define a type for cached route entries.
interface RouteCacheEntry {
  handler: (req: Request) => Promise<any> | any;
  metadata: any;
  onClose?: any;
}

// A typed cache for routes to avoid re-importing modules.
export const routeCache: Map<string, RouteCacheEntry> = new Map();

/**
 * Recursively sets up API routes from a directory structure.
 * - Processes directories and files.
 * - Skips certain folders/files.
 * - Supports dynamic route parameters via bracket syntax.
 *
 * @param app - The application instance (e.g. an Express-like router).
 * @param startPath - The directory path where routes are defined.
 * @param basePath - The API base path (default is "/api").
 */
export async function setupApiRoutes(
  app: any,
  startPath: string,
  basePath: string = "/api"
): Promise<void> {
  try {
    const entries = await fs.readdir(startPath, { withFileTypes: true });

    // Separate files and directories for parallel processing
    const files: { entry: typeof entries[0]; entryPath: string }[] = [];
    const directories: { entry: typeof entries[0]; entryPath: string; newBasePath: string }[] = [];
    const bracketDirs: { entry: typeof entries[0]; entryPath: string; newBasePath: string }[] = [];

    for (const entry of entries) {
      // Skip certain directories and files
      if (
        (entry.isDirectory() && entry.name === "util") ||
        entry.name === `queries${fileExtension}` ||
        entry.name === `utils${fileExtension}`
      ) {
        continue;
      }

      const entryPath: string = sanitizePath(path.join(startPath, entry.name));

      if (entry.isDirectory()) {
        let newBasePath = basePath;
        // If the folder name is wrapped in parentheses (grouping folder), skip path addition
        if (!/^\(.*\)$/.test(entry.name)) {
          newBasePath = `${basePath}/${entry.name.replace(/\[(\w+)\]/, ":$1")}`;
        }
        // Separate bracketed directories (dynamic routes) to process last
        if (entry.name.includes("[")) {
          bracketDirs.push({ entry, entryPath, newBasePath });
        } else {
          directories.push({ entry, entryPath, newBasePath });
        }
      } else {
        files.push({ entry, entryPath });
      }
    }

    // Process files first (register routes)
    await Promise.all(
      files.map(async ({ entry, entryPath }) => {
        const [fileName, method] = entry.name.split(".");
        let routePath = basePath + (fileName !== "index" ? `/${fileName}` : "");
        // Convert bracketed parameters to Express-like ":id" syntax
        routePath = routePath
          .replace(/\[(\w+)\]/g, ":$1")
          .replace(/\.get|\.post|\.put|\.delete|\.del|\.ws/, "");

        if (typeof app[method] === "function") {
          if (method === "ws") {
            setupWebSocketEndpoint(app, routePath, entryPath);
          } else {
            await handleHttpMethod(app, method, routePath, entryPath);
          }
        }
      })
    );

    // Process non-bracketed directories in parallel
    await Promise.all(
      directories.map(({ entryPath, newBasePath }) =>
        setupApiRoutes(app, entryPath, newBasePath)
      )
    );

    // Process bracketed directories last (to ensure dynamic routes are registered after static ones)
    await Promise.all(
      bracketDirs.map(({ entryPath, newBasePath }) =>
        setupApiRoutes(app, entryPath, newBasePath)
      )
    );
  } catch (error: any) {
    logger.error("ROUTES", `Error setting up API routes in ${startPath}`, error);
    throw error;
  }
}

/**
 * Registers an HTTP route.
 *
 * It caches the route module (handler and metadata), parses the request body,
 * and then runs through a middleware chain (including API verification, rate limiting,
 * authentication, and role/maintenance checks) before handling the request.
 *
 * @param app - The application instance.
 * @param method - The HTTP method (e.g. "get", "post").
 * @param routePath - The full route path.
 * @param entryPath - The file system path for the route handler.
 */
async function handleHttpMethod(
  app: any,
  method: string,
  routePath: string,
  entryPath: string
): Promise<void> {
  app[method](routePath, async (res: Response, req: Request) => {
    const startTime: number = Date.now();
    let metadata: any, handler: (req: Request) => Promise<any> | any;
    const cached: RouteCacheEntry | undefined = routeCache.get(entryPath);

    if (cached) {
      handler = cached.handler as (req: Request) => Promise<any> | any;
      metadata = cached.metadata;
      req.setMetadata(metadata);
    } else {
      try {
        const handlerModule = await import(entryPath);
        handler = handlerModule.default;
        if (!handler) {
          throw new Error(`Handler not found for ${entryPath}`);
        }
        metadata = handlerModule.metadata;
        if (!metadata) {
          throw new Error(`Metadata not found for ${entryPath}`);
        }
        req.setMetadata(metadata);
        routeCache.set(entryPath, { handler, metadata });
      } catch (error: any) {
        logger.error("ROUTE", `Error loading handler for ${entryPath}`, error);
        res.handleError(500, error.message);
        return;
      }
    }

    if (typeof handler !== "function") {
      throw new Error(`Handler is not a function for ${entryPath}`);
    }

    try {
      await req.parseBody();
    } catch (error: any) {
      logger.error("ROUTE", `Error parsing request body for ${entryPath}`, error);
      res.handleError(400, `Invalid request body: ${error.message}`);
      return;
    }

    // Benchmark the request (debug level only)
    const endBenchmarking = (): void => {
      const duration: number = Date.now() - startTime;
      if (duration > 1000) {
        logger.warn("ROUTE", `Slow request: ${method.toUpperCase()} ${routePath} (${duration}ms)`);
      } else {
        logger.debug("ROUTE", `${method.toUpperCase()} ${routePath} (${duration}ms)`);
      }
    };

    // Determine the middleware chain based on metadata flags.
    if (metadata.requiresApi) {
      await handleApiVerification(res, req, async () => {
        await handleRequest(res, req, handler, entryPath, metadata);
        endBenchmarking();
      });
      return;
    }

    if (!metadata.requiresAuth) {
      await handleRequest(res, req, handler, entryPath, metadata);
      endBenchmarking();
      return;
    }

    await rateLimit(res, req, async () => {
      await authenticate(res, req, async () => {
        await rolesGate(app, res, req, routePath, method, async () => {
          await siteMaintenanceAccessGate(app, res, req, async () => {
            await handleRequest(res, req, handler, entryPath, metadata);
            endBenchmarking();
          });
        });
      });
    });
  });
}

/**
 * Processes middleware array from metadata.
 * Middleware names directly map to rate limiters in rateLimiters object.
 * Example: middleware: ["copyTradingAdmin"] -> rateLimiters.copyTradingAdmin
 *
 * @param middleware - Array of middleware names (must match keys in rateLimiters)
 * @param req - The request object
 */
async function processMiddleware(
  middleware: string[],
  req: Request
): Promise<void> {
  for (const middlewareName of middleware) {
    const rateLimiter = rateLimiters[middlewareName as keyof typeof rateLimiters];

    if (rateLimiter) {
      await rateLimiter(req);
    } else {
      logger.warn("MIDDLEWARE", `Unknown middleware: ${middlewareName}`);
    }
  }
}

/**
 * Executes the route handler and sends the response.
 *
 * If metadata contains logModule and logTitle, the handler is automatically
 * wrapped with logging context. The ctx object is passed to the handler via
 * the request data object.
 *
 * @param res - The response object.
 * @param req - The request object.
 * @param handler - The route handler function.
 * @param entryPath - The file system path for logging errors.
 * @param metadata - The route metadata.
 */
async function handleRequest(
  res: Response,
  req: Request,
  handler: (req: Request) => Promise<any> | any,
  entryPath: string,
  metadata?: any
): Promise<void> {
  // Check if logging is enabled via metadata
  const hasLogging = metadata?.logModule && metadata?.logTitle;

  try {
    // Process middleware from metadata if present
    if (metadata?.middleware && Array.isArray(metadata.middleware)) {
      await processMiddleware(metadata.middleware, req);
    }

    let result: any;

    if (hasLogging) {
      // Wrap with logging context - add ctx to the req object
      result = await withLogger(
        metadata.logModule,
        metadata.logTitle,
        { user: req.user },
        async (ctx: ApiContext) => {
          (req as any).ctx = ctx;
          return await handler(req);
        },
        { method: req.method, url: req.url?.split("?")[0] }
      );
    } else {
      // Execute without logging context
      result = await handler(req);
    }

    // Apply demo masking if configured in metadata
    if (metadata?.demoMask && Array.isArray(metadata.demoMask)) {
      result = applyDemoMask(result, metadata.demoMask);
    }

    res.sendResponse(req, 200, result, metadata?.responseType);
  } catch (error: any) {
    const statusCode: number = error.statusCode || 500;
    const message: string = error.message || "Internal Server Error";

    // Only log server errors (5xx) - client errors (4xx) are expected behavior
    // Skip logging if withLogger already handled it (hasLogging is true)
    if (statusCode >= 500 && !hasLogging) {
      const method = req.method?.toUpperCase() || "???";
      const apiPath = req.url?.split("?")[0] || entryPath;
      logger.error("API", `${method} ${apiPath} → ${statusCode} ${message}`);
    }

    // Handle validation errors by sending a custom response
    if (error.validationErrors) {
      res.sendResponse(req, statusCode, {
        message,
        statusCode,
        validationErrors: error.validationErrors,
      });
      return;
    }

    res.handleError(statusCode, message);
  }
}
