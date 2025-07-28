import fs from "fs/promises";
import path from "path";
import { Request, Response } from "..";
import {
  authenticate,
  handleApiVerification,
  rateLimit,
  rolesGate,
  siteMaintenanceAccessGate,
} from "../handler/Middleware";
import { sanitizePath } from "@b/utils/validation";
import { isProduction } from "@b/utils/constants";
import { logError } from "@b/utils/logger";
import { setupWebSocketEndpoint } from "./Websocket";

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
    // Sort so that file entries come before directories and bracketed directories come last.
    const sortedEntries = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return 1;
      if (!a.isDirectory() && b.isDirectory()) return -1;
      if (a.isDirectory() && b.isDirectory()) {
        const aHasBrackets = a.name.includes("[");
        const bHasBrackets = b.name.includes("[");
        if (aHasBrackets && !bHasBrackets) return 1;
        if (!aHasBrackets && bHasBrackets) return -1;
      }
      return 0;
    });

    for (const entry of sortedEntries) {
      const entryPath: string = sanitizePath(path.join(startPath, entry.name));

      // Skip certain directories and files.
      if (
        (entry.isDirectory() && entry.name === "util") ||
        entry.name === `queries${fileExtension}` ||
        entry.name === `utils${fileExtension}`
      ) {
        continue;
      }

      // If entry is a directory, update the basePath and recurse.
      if (entry.isDirectory()) {
        let newBasePath = basePath;
        // If the folder name is wrapped in parentheses (grouping folder), skip it.
        if (!/^\(.*\)$/.test(entry.name)) {
          newBasePath = `${basePath}/${entry.name.replace(/\[(\w+)\]/, ":$1")}`;
        }
        await setupApiRoutes(app, entryPath, newBasePath);
        continue;
      }

      // For files: determine the route path and HTTP method.
      const [fileName, method] = entry.name.split(".");
      let routePath = basePath + (fileName !== "index" ? `/${fileName}` : "");
      // Convert bracketed parameters (e.g. [id]) to Express-like ":id" syntax.
      routePath = routePath
        .replace(/\[(\w+)\]/g, ":$1")
        .replace(/\.get|\.post|\.put|\.delete|\.del|\.ws/, "");

      // Register the route if the HTTP method exists on the app.
      if (typeof app[method] === "function") {
        if (method === "ws") {
          setupWebSocketEndpoint(app, routePath, entryPath);
        } else {
          await handleHttpMethod(app, method, routePath, entryPath);
        }
      }
    }
  } catch (error: any) {
    logError("setupApiRoutes", error, startPath);
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
        logError("route", error, entryPath);
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
      logError("route", error, entryPath);
      res.handleError(400, `Invalid request body: ${error.message}`);
      return;
    }

    // Benchmark the request and log performance with color-coded labels.
    const endBenchmarking = (): void => {
      const duration: number = Date.now() - startTime;
      let color = "\x1b[0m";
      let label = "FAST";

      if (duration > 1000) {
        color = "\x1b[41m";
        label = "VERY SLOW";
      } else if (duration > 500) {
        color = "\x1b[31m";
        label = "SLOW";
      } else if (duration > 200) {
        color = "\x1b[33m";
        label = "MODERATE";
      } else if (duration > 100) {
        color = "\x1b[32m";
        label = "GOOD";
      } else if (duration > 50) {
        color = "\x1b[36m";
        label = "FAST";
      } else if (duration > 10) {
        color = "\x1b[34m";
        label = "VERY FAST";
      } else {
        color = "\x1b[35m";
        label = "EXCELLENT";
      }
      console.log(
        `${color}[${label}] Request to ${routePath} (${method.toUpperCase()}) - Duration: ${duration}ms\x1b[0m`
      );
    };

    // Determine the middleware chain based on metadata flags.
    if (metadata.requiresApi) {
      await handleApiVerification(res, req, async () => {
        await handleRequest(res, req, handler, entryPath);
        endBenchmarking();
      });
      return;
    }

    if (!metadata.requiresAuth) {
      await handleRequest(res, req, handler, entryPath);
      endBenchmarking();
      return;
    }

    await rateLimit(res, req, async () => {
      await authenticate(res, req, async () => {
        await rolesGate(app, res, req, routePath, method, async () => {
          await siteMaintenanceAccessGate(app, res, req, async () => {
            await handleRequest(res, req, handler, entryPath);
            endBenchmarking();
          });
        });
      });
    });
  });
}

/**
 * Executes the route handler and sends the response.
 *
 * If an error occurs, it logs the error and sends an error response.
 *
 * @param res - The response object.
 * @param req - The request object.
 * @param handler - The route handler function.
 * @param entryPath - The file system path for logging errors.
 */
async function handleRequest(
  res: Response,
  req: Request,
  handler: (req: Request) => Promise<any> | any,
  entryPath: string
): Promise<void> {
  try {
    const result = await handler(req);
    res.sendResponse(req, 200, result);
  } catch (error: any) {
    logError("route", error, entryPath);
    const statusCode: number = error.statusCode || 500;
    const message: string = error.message || "Internal Server Error";
    
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
