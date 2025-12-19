/**
 * API Endpoint Logger with Context Inheritance
 *
 * This module provides a logging system for API endpoints that:
 * 1. Groups all logs from an endpoint operation together
 * 2. Allows utility functions to inherit the logging context from their caller
 * 3. Tracks operation progress with steps
 * 4. Provides clear success/failure indicators
 *
 * Usage in endpoints:
 *   import { withLogger, ApiContext } from "@b/utils/console";
 *
 *   export default async (data: Handler) => {
 *     return withLogger("DEPOSIT", "Stripe deposit verification", data, async (ctx) => {
 *       ctx.step("Retrieving Stripe session");
 *       const session = await stripe.checkout.sessions.retrieve(sessionId);
 *
 *       ctx.step("Validating payment status");
 *       if (session.payment_status !== "paid") {
 *         ctx.fail("Payment not completed");
 *         throw new Error("Payment not completed");
 *       }
 *
 *       ctx.step("Creating wallet if needed");
 *       const wallet = await getOrCreateWallet(userId, currency, ctx); // ctx passed to utility
 *
 *       ctx.step("Recording transaction");
 *       const transaction = await createTransaction(...);
 *
 *       ctx.step("Sending notification");
 *       await sendNotification(...);
 *
 *       return { transaction, balance: wallet.balance };
 *     });
 *   };
 *
 * Usage in utility functions (context inheritance):
 *   export async function getOrCreateWallet(userId: string, currency: string, ctx?: ApiContext) {
 *     ctx?.step("Checking existing wallet");
 *     let wallet = await models.wallet.findOne({ where: { userId, currency } });
 *
 *     if (!wallet) {
 *       ctx?.step("Creating new wallet");
 *       wallet = await models.wallet.create({ userId, currency, type: "FIAT" });
 *     }
 *
 *     return wallet;
 *   }
 */

import { AsyncLocalStorage } from "async_hooks";
import { logger, type LiveTaskHandle } from "./logger";

// Async local storage for context propagation
const asyncLocalStorage = new AsyncLocalStorage<ApiContext>();

/**
 * API operation context that tracks logging state
 */
export interface ApiContext {
  /** Module name for logs (e.g., "DEPOSIT", "WITHDRAW") */
  module: string;
  /** Operation title */
  title: string;
  /** Request ID for tracing */
  requestId: string;
  /** User ID if authenticated */
  userId?: string;
  /** Log a step in the operation */
  step: (message: string, status?: "info" | "success" | "warn" | "error") => void;
  /** Mark operation as successful */
  success: (message?: string) => void;
  /** Mark operation as failed */
  fail: (message: string) => void;
  /** Log a warning */
  warn: (message: string) => void;
  /** Log debug info (only in debug mode) */
  debug: (message: string) => void;
  /** Internal: steps collected */
  _steps: Array<{ message: string; status: string; time: number }>;
  /** Internal: final status */
  _status: "running" | "success" | "error" | "warn";
  /** Internal: start time */
  _startTime: number;
}

/**
 * Get the current API context from async local storage
 * Utility functions can call this to get the current logging context
 */
export function getApiContext(): ApiContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Log a step in the current context (if any)
 * Safe to call even if no context exists
 */
export function logStep(message: string, status?: "info" | "success" | "warn" | "error"): void {
  const ctx = getApiContext();
  if (ctx) {
    ctx.step(message, status);
  }
}

/**
 * Log success in the current context
 */
export function logSuccess(message?: string): void {
  const ctx = getApiContext();
  if (ctx) {
    ctx.success(message);
  }
}

/**
 * Log failure in the current context
 */
export function logFail(message: string): void {
  const ctx = getApiContext();
  if (ctx) {
    ctx.fail(message);
  }
}

/**
 * Log a warning in the current context
 */
export function logWarn(message: string): void {
  const ctx = getApiContext();
  if (ctx) {
    ctx.warn(message);
  }
}

/**
 * Log debug in the current context
 */
export function logDebug(message: string): void {
  const ctx = getApiContext();
  if (ctx) {
    ctx.debug(message);
  }
}

// Generate unique request ID
let requestCounter = 0;
function generateRequestId(): string {
  requestCounter = (requestCounter + 1) % 1000000;
  return `${Date.now().toString(36)}-${requestCounter.toString(36)}`;
}

/**
 * Create an API context for an operation with live animated logging
 */
function createApiContext(
  module: string,
  title: string,
  userId?: string,
  options?: { method?: string; url?: string }
): ApiContext & { _liveHandle: LiveTaskHandle } {
  const requestId = generateRequestId();
  const steps: Array<{ message: string; status: string; time: number }> = [];
  let status: "running" | "success" | "error" | "warn" = "running";
  const startTime = Date.now();

  // Start a live animated task
  const liveHandle = logger.live(module, title);

  // Set request metadata if provided
  if (options?.method && options?.url) {
    liveHandle.setRequest(options.method, options.url);
  }

  const ctx = {
    module,
    title,
    requestId,
    userId,
    _steps: steps,
    _status: status,
    _startTime: startTime,
    _liveHandle: liveHandle,

    step(message: string, stepStatus: "info" | "success" | "warn" | "error" = "info") {
      steps.push({ message, status: stepStatus, time: Date.now() });
      // Also send to live console for real-time display
      liveHandle.step(message, stepStatus);
    },

    success(message?: string) {
      if (message) {
        steps.push({ message, status: "success", time: Date.now() });
        liveHandle.step(message, "success");
      }
      status = "success";
      this._status = status;
    },

    fail(message: string) {
      steps.push({ message, status: "error", time: Date.now() });
      liveHandle.step(message, "error");
      status = "error";
      this._status = status;
    },

    warn(message: string) {
      steps.push({ message, status: "warn", time: Date.now() });
      liveHandle.step(message, "warn");
    },

    debug(message: string) {
      // Only add debug steps if LOG_LEVEL=debug
      if (process.env.LOG_LEVEL === "debug") {
        steps.push({ message, status: "info", time: Date.now() });
        liveHandle.step(message, "info");
      }
    },
  };

  return ctx;
}

/**
 * Complete the live task with final status
 */
function completeOperation(ctx: ApiContext & { _liveHandle?: LiveTaskHandle }) {
  if (!ctx._liveHandle) return;

  const duration = Date.now() - ctx._startTime;

  if (ctx._status === "success") {
    // Pass duration to succeed - it will handle formatting the last step appropriately
    ctx._liveHandle.succeed(`${duration}`);
  } else {
    // Don't add redundant "Failed" message - the error step already shows the reason
    ctx._liveHandle.fail(`${duration}`);
  }
}

/**
 * Wrap an endpoint handler with logging context
 *
 * @param module - Module name for logs (e.g., "DEPOSIT", "WITHDRAW", "EXCHANGE")
 * @param title - Operation title (e.g., "Stripe deposit verification")
 * @param data - Handler data containing user info
 * @param handler - The async handler function
 * @param options - Optional request info (method, url)
 * @returns The result of the handler
 *
 * @example
 * export default async (data: Handler) => {
 *   return withLogger("DEPOSIT", "Stripe deposit", data, async (ctx) => {
 *     ctx.step("Validating request");
 *     // ... operation logic
 *     return result;
 *   });
 * };
 */
export async function withLogger<T>(
  module: string,
  title: string,
  data: { user?: { id: string } },
  handler: (ctx: ApiContext) => Promise<T>,
  options?: { method?: string; url?: string }
): Promise<T> {
  const ctx = createApiContext(module, title, data.user?.id, options);

  try {
    const result = await asyncLocalStorage.run(ctx, async () => {
      return await handler(ctx);
    });

    // Auto-success if no explicit fail was called
    if (ctx._status === "running") {
      ctx._status = "success";
    }

    // Complete the live task
    completeOperation(ctx);

    return result;
  } catch (error) {
    // Mark as failed if not already
    if (ctx._status === "running") {
      ctx.fail(error instanceof Error ? error.message : String(error));
    }

    // Complete the live task
    completeOperation(ctx);

    // Re-throw the error
    throw error;
  }
}

/**
 * Decorator-style wrapper for simpler usage
 * Creates a logged version of any async function
 *
 * @example
 * const processDeposit = logged("DEPOSIT", "Process deposit", async (ctx, amount, currency) => {
 *   ctx.step("Validating amount");
 *   // ...
 *   return result;
 * });
 */
export function logged<TArgs extends any[], TResult>(
  module: string,
  title: string,
  fn: (ctx: ApiContext, ...args: TArgs) => Promise<TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const ctx = createApiContext(module, title);

    try {
      const result = await asyncLocalStorage.run(ctx, async () => {
        return await fn(ctx, ...args);
      });

      if (ctx._status === "running") {
        ctx._status = "success";
      }

      completeOperation(ctx);
      return result;
    } catch (error) {
      if (ctx._status === "running") {
        ctx.fail(error instanceof Error ? error.message : String(error));
      }

      completeOperation(ctx);
      throw error;
    }
  };
}

/**
 * Run a sub-operation within the current context
 * Steps will be added to the parent context
 *
 * @example
 * // In a utility function
 * export async function sendEmail(userId: string, template: string) {
 *   return withSubOperation("Sending email", async () => {
 *     // ... email logic
 *   });
 * }
 */
export async function withSubOperation<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const ctx = getApiContext();

  if (ctx) {
    ctx.step(label);
  }

  try {
    const result = await fn();

    if (ctx) {
      ctx.step(`${label} completed`, "success");
    }

    return result;
  } catch (error) {
    if (ctx) {
      ctx.step(`${label} failed: ${error instanceof Error ? error.message : error}`, "error");
    }
    throw error;
  }
}

// Re-export context type for use in utility functions
export type { ApiContext as LogContext };
