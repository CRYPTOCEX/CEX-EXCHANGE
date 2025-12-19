/**
 * Console Utilities
 *
 * Centralized logging system with:
 * - Colored console output with icons
 * - Buffered group logging (atomic output)
 * - Live animated tasks with spinners
 * - API endpoint logging with context inheritance
 *
 * Usage:
 *   import { logger, colors, icons, withLogger } from "@b/utils/console";
 *
 *   // Basic logging
 *   logger.info("MODULE", "Message");
 *   logger.error("MODULE", "Error", error);
 *
 *   // Grouped logging (atomic output)
 *   logger.group("MODULE", "Task title");
 *   logger.groupItem("MODULE", "Step 1");
 *   logger.groupEnd("MODULE", "Done", true);
 *
 *   // Live animated tasks
 *   const task = logger.live("MODULE", "Loading...");
 *   task.step("Step 1");
 *   task.succeed("Done!");
 *
 *   // API endpoint logging
 *   export default async (data: Handler) => {
 *     return withLogger("DEPOSIT", "Process deposit", data, async (ctx) => {
 *       ctx.step("Validating");
 *       // ...
 *       return result;
 *     });
 *   };
 */

// Re-export everything from sub-modules
export { colors, icons, box } from "./colors";
export { logQueue } from "./log-queue";
export { liveConsole, type LiveTaskHandle } from "./live-console";
export {
  logger,
  console$,
  logInfo,
  logSuccess,
  logWarn,
  logError,
  logDebug,
  type LiveTaskHandle as LoggerLiveTaskHandle,
} from "./logger";
export {
  withLogger,
  logged,
  withSubOperation,
  getApiContext,
  logStep,
  logSuccess as logCtxSuccess,
  logFail,
  logWarn as logCtxWarn,
  logDebug as logCtxDebug,
  type ApiContext,
  type LogContext,
} from "./api-logger";

// Default export is the logger
export { logger as default } from "./logger";
