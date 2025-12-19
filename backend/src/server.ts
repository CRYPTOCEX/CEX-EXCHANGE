// server.ts
import {
  App,
  type AppOptions,
  type RecognizedString,
  type WebSocketBehavior,
} from "uWebSockets.js";
import { RouteHandler } from "./handler/RouteHandler";
import { type IErrorHandler, type IRequestHandler } from "./types";
import {
  allowedOrigins,
  serveStaticFile,
  setCORSHeaders,
  setupProcessEventHandlers,
} from "./utils";
import { setupApiRoutes } from "@b/handler/Routes";
import { setupSwaggerRoute } from "@b/docs";
import { setupDefaultRoutes } from "@b/utils";
import { rolesManager } from "@b/utils/roles";
import CronJobManager, { createWorker } from "@b/cron";
import { db } from "@b/db";
import { console$ } from "@b/utils/console";
import { initializeScylla, initializeMatchingEngine } from "@b/utils/safe-imports";
import { Response } from "./handler/Response";
import { logger } from "@b/utils/console";
import * as path from "path";
import { baseUrl, isProduction } from "@b/utils/constants";
import { CacheManager } from "./utils/cache";
import { isMainThread, threadId } from "worker_threads";
import { sequelize } from "@b/db";

// Get package version - use path resolution that works in both dev and production
// In dev: backend/src/server.ts -> root package.json
// In prod: backend/dist/src/server.js -> root package.json
const pkg = (() => {
  try {
    // Try root package.json first (3 levels up from dist/src/server.js or 2 from src/server.ts)
    const rootPkg = isProduction
      ? require(path.join(__dirname, "../../../package.json"))
      : require(path.join(__dirname, "../../package.json"));
    if (rootPkg.version) return rootPkg;
  } catch {}
  try {
    // Fallback: try to find it via process.cwd()
    return require(path.join(process.cwd(), "package.json"));
  } catch {}
  return { version: "unknown" };
})();

export class MashServer extends RouteHandler {
  private app;
  private roles: any;
  private benchmarkRoutes: { method: string; path: string }[] = [];
  private initPromise: Promise<void>;
  private initResolve!: () => void;
  private initReject!: (error: Error) => void;
  private startTime: number;

  constructor(options: AppOptions = {}) {
    super();
    this.app = App(options);
    this.cors();
    this.startTime = Date.now();

    // Create a promise that will resolve when initialization is complete
    this.initPromise = new Promise((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;
    });

    // Show banner only on main thread
    if (isMainThread) {
      const appName = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";
      const env = isProduction ? "Production" : "Development";
      console$.banner(appName, pkg.version, env);
    }

    this.initializeServer();
    setupProcessEventHandlers();
  }

  /**
   * Wait for initialization to complete
   */
  public async waitForInit(): Promise<void> {
    return this.initPromise;
  }

  /**
   * Get the total startup time since server was created
   */
  public getStartTime(): number {
    return this.startTime;
  }

  public listen(port: number, cb: VoidFunction) {
    this.app.any("/*", (res, req) => {
      let responseSent = false;

      res.onAborted(() => {
        responseSent = true;
      });

      try {
        const url = req.getUrl();
        if (url.startsWith("/uploads/")) {
          const handled = serveStaticFile(
            res,
            req,
            url,
            () => (responseSent = true)
          );
          if (handled) return;
        }
        this.processRoute(res, req, () => (responseSent = true));
      } catch (error) {
        console.error("Server error :", error);
        if (!responseSent && !res.aborted) {
          const response = new Response(res);
          response.handleError(500, `Internal Server Error: ${error.message}`);
          responseSent = true;
        }
      }
    });

    this.app.listen(port, cb);
  }

  public async initializeServer() {
    try {
      let cronCount = 0;
      let extensionCount = 0;

      // Database
      await this.runTask("Database", async () => {
        await this.ensureDatabaseReady();
      });

      // Roles & Permissions
      await this.runTask("Roles", async () => {
        await this.setupRoles();
      });

      // API Routes
      await this.runTask("Routes", async () => {
        await this.setupRoutes();
      });

      // Cron Jobs (main thread only)
      if (isMainThread) {
        await this.runTask("Cron", async () => {
          cronCount = await this.setupCronJobs();
        });
      }

      // Extensions
      await this.runTask("Extensions", async () => {
        const cacheManager = CacheManager.getInstance();
        const extensions = await cacheManager.getExtensions();
        extensionCount = extensions.size;
        if (extensions.has("ecosystem")) {
          await this.setupEcosystem();
        }
      });

      // Signal that initialization is complete
      this.initResolve();
    } catch (error) {
      logger.error("SERVER", "Initialization failed", error);
      this.initReject(error as Error);
      process.exit(1);
    }
  }

  /**
   * Run a task with minimal logging - shows spinner while running, then result
   */
  private async runTask(name: string, fn: () => Promise<void>): Promise<void> {
    const task = console$.live(name.toUpperCase(), `${name}...`);
    try {
      await fn();
      task.succeed();
    } catch (error: any) {
      task.fail(error.message);
      throw error;
    }
  }

  /**
   * Combined initialization and listen - ensures proper startup sequence
   */
  public async startServer(port: number): Promise<void> {
    // Wait for initialization to complete
    await this.waitForInit();

    // Now start listening
    return new Promise((resolve) => {
      this.listen(port, () => {
        console$.ready(port, this.startTime);
        resolve();
      });
    });
  }

  private async ensureDatabaseReady(): Promise<void> {
    if (!sequelize) {
      throw new Error("Sequelize instance is not initialized.");
    }
    // Initialize the database (sync tables)
    await db.initialize();
  }

  // Helper method to execute async functions safely and log any errors
  private async safeExecute(fn: () => Promise<void>, label: string) {
    try {
      await fn();
    } catch (error) {
      logger.error("SERVER", `${label} failed`, error);
      throw error;
    }
  }

  // Helper that returns a count from the executed function
  private async safeExecuteWithCount(fn: () => Promise<number | void>, label: string): Promise<number> {
    try {
      const result = await fn();
      return typeof result === "number" ? result : 0;
    } catch (error) {
      logger.error("SERVER", `${label} failed`, error);
      throw error;
    }
  }

  private async setupRoles() {
    await rolesManager.initialize();
    this.setRoles(rolesManager.roles);
  }

  private async setupRoutes() {
    const fs = await import("fs/promises");

    // Determine the correct API routes path
    let apiRoutesPath: string;

    if (isProduction) {
      // In production, the API routes are in the dist folder relative to the current working directory
      apiRoutesPath = path.join(__dirname, "api");
    } else {
      // In development, use the source API path
      apiRoutesPath = path.join(baseUrl, "src", "api");
    }

    // Check if the path exists using async access (non-blocking)
    const pathExists = async (p: string) => {
      try {
        await fs.access(p);
        return true;
      } catch {
        return false;
      }
    };

    if (await pathExists(apiRoutesPath)) {
      await setupApiRoutes(this, apiRoutesPath);
    } else {
      // Try alternative paths in parallel
      const alternativePaths = [
        path.join(process.cwd(), "backend", "dist", "src", "api"),
        path.join(process.cwd(), "dist", "src", "api"),
        path.join(__dirname, "..", "api"),
        path.join(baseUrl, "api"),
      ];

      const results = await Promise.all(
        alternativePaths.map(async (p) => ({ path: p, exists: await pathExists(p) }))
      );

      const validPath = results.find(r => r.exists);
      if (validPath) {
        await setupApiRoutes(this, validPath.path);
      }
    }

    setupSwaggerRoute(this);
    setupDefaultRoutes(this);
  }

  private async setupCronJobs(): Promise<number> {
    if (!isMainThread) return 0; // Only the main thread should setup cron jobs
    const cronJobManager = await CronJobManager.getInstance();
    const cronJobs = await cronJobManager.getCronJobs();

    // Create all workers in parallel (silent - no individual logging)
    await Promise.all(
      cronJobs.map((job) => createWorker(job.name, job.handler, job.period))
    );

    return cronJobs.length;
  }

  private async setupEcosystem() {
    try {
      await initializeScylla();
      await initializeMatchingEngine();
    } catch (error) {
      logger.error("ECOSYSTEM", "Error initializing ecosystem", error);
    }
  }

  public get(path: string, ...handler: IRequestHandler[]) {
    this.benchmarkRoutes.push({ method: "get", path });
    super.set("get", path, ...handler);
  }

  public post(path: string, ...handler: IRequestHandler[]) {
    super.set("post", path, ...handler);
  }

  public put(path: string, ...handler: IRequestHandler[]) {
    super.set("put", path, ...handler);
  }

  public patch(path: string, ...handler: IRequestHandler[]) {
    super.set("patch", path, ...handler);
  }

  public del(path: string, ...handler: IRequestHandler[]) {
    super.set("delete", path, ...handler);
  }

  public options(path: string, ...handler: IRequestHandler[]) {
    super.set("options", path, ...handler);
  }

  public head(path: string, ...handler: IRequestHandler[]) {
    super.set("head", path, ...handler);
  }

  public connect(path: string, ...handler: IRequestHandler[]) {
    super.set("connect", path, ...handler);
  }

  public trace(path: string, ...handler: IRequestHandler[]) {
    super.set("trace", path, ...handler);
  }

  public all(path: string, ...handler: IRequestHandler[]) {
    super.set("all", path, ...handler);
  }

  public getBenchmarkRoutes() {
    return this.benchmarkRoutes;
  }

  public use(middleware: IRequestHandler) {
    super.use(middleware);
  }

  public error(cb: IErrorHandler) {
    super.error(cb);
  }

  public notFound(cb: IRequestHandler) {
    super.notFound(cb);
  }

  public ws<T>(pattern: RecognizedString, behavior: WebSocketBehavior<T>) {
    this.app.ws(pattern, behavior);
  }

  public cors() {
    const isDev = process.env.NODE_ENV === "development";
    
    this.app.options("/*", (res, req) => {
      // Get origin from headers - try different methods
      const origin = req.getHeader?.("origin") || req.getHeader?.("Origin") || 
                     req.headers?.["origin"] || req.headers?.["Origin"];
      
      // Always set CORS headers in development, check origins in production
      if (isDev) {
        // Development: Always allow
        setCORSHeaders(res, origin || "http://localhost:3000");
      } else {
        // Production: Check allowed origins
        const isAllowed = origin && allowedOrigins.includes(origin);
        if (isAllowed) {
          setCORSHeaders(res, origin);
        }
      }
      res.end();
    });

    this.use((res, req, next) => {
      // Get origin from headers - try different methods
      const origin = req.getHeader?.("origin") || req.getHeader?.("Origin") || 
                     req.headers?.["origin"] || req.headers?.["Origin"];
      
      // Always set CORS headers in development, check origins in production
      if (isDev) {
        // Development: Always allow
        setCORSHeaders(res, origin || "http://localhost:3000");
      } else {
        // Production: Check allowed origins
        const isAllowed = origin && allowedOrigins.includes(origin);
        if (isAllowed) {
          setCORSHeaders(res, origin);
        }
      }
      
      if (typeof next === "function") {
        next();
      }
    });
  }

  public setRoles(roles: Map<any, any>) {
    this.roles = roles;
  }

  public getRole(id: any) {
    return this.roles.get(id);
  }

  public getDescriptor() {
    // Return the descriptor of the uWS app instance
    return this.app.getDescriptor();
  }

  public addChildAppDescriptor(descriptor: any) {
    // Add a child app descriptor to the main app
    this.app.addChildAppDescriptor(descriptor);
  }
}
