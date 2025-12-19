/**
 * Centralized Console Logger
 * Professional logging with colors, icons, and structured formatting
 *
 * Usage:
 *   import { logger } from "@b/utils/console";
 *
 *   // Basic logging
 *   logger.info("MODULE", "Message here");
 *   logger.success("MODULE", "Operation completed");
 *   logger.error("MODULE", "Something failed", error);
 *   logger.warn("MODULE", "Warning message");
 *   logger.debug("MODULE", "Debug info");
 *
 *   // Grouped initialization (for startup tasks - BUFFERED to prevent interleaving)
 *   // All items are collected and printed together when groupEnd() is called
 *   logger.group("BTC_SCAN", "Starting Bitcoin deposit scanner...");
 *   logger.groupItem("BTC_SCAN", "Initializing BTC Core RPC connection", "info");
 *   logger.groupItem("BTC_SCAN", "RPC call failed", "error");
 *   logger.groupEnd("BTC_SCAN", "Scanner ready", true);
 *   // Output (printed all at once on groupEnd):
 *   // 12:34:56 [BTC_SCAN] ▶ Starting Bitcoin deposit scanner...
 *   //                     ├─ Initializing BTC Core RPC connection
 *   //                     ├─ ✗ RPC call failed
 *   //                     └─ ✓ Scanner ready (125ms)
 *
 *   // Live animated tasks (with spinners and progress)
 *   const task = logger.live("BTC_SCAN", "Starting Bitcoin scanner...");
 *   task.step("Connecting to node...");
 *   task.step("Syncing blocks...", "success");
 *   task.progress(50, "Processing...");
 *   task.succeed("Scanner ready!");
 *   // or task.fail("Connection failed");
 */

import { colors, icons, box } from "./colors";
import { logQueue } from "./log-queue";

// Log levels for filtering
type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// Buffered group item structure
interface BufferedGroupItem {
  message: string;
  status: "info" | "success" | "warn" | "error";
}

// Active group structure with buffer
interface ActiveGroup {
  module: string;
  title: string;
  startTime: number;
  items: BufferedGroupItem[];
}

// Live task handle for animated spinners
export interface LiveTaskHandle {
  step: (message: string, status?: "info" | "success" | "warn" | "error") => void;
  progress: (percent: number, message?: string) => void;
  succeed: (message?: string) => void;
  fail: (message?: string) => void;
  warn: (message?: string) => void;
  setRequest: (method: string, url: string) => void;
}

class Logger {
  private level: LogLevel = "info";
  private sectionTimers: Map<string, number> = new Map();
  private taskTimers: Map<string, number> = new Map();
  private activeTasks: Set<string> = new Set();
  // Buffered groups - logs are collected and printed all at once on groupEnd()
  private activeGroups: Map<string, ActiveGroup> = new Map();
  // Maps child modules to their parent group module (e.g., "BTC_NODE" -> "BTC_SCAN")
  private moduleGroupAliases: Map<string, string> = new Map();

  constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
      this.level = envLevel;
    }
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel) {
    this.level = level;
  }

  /**
   * Check if a message should be logged based on current level
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[this.level];
  }

  /**
   * Format module name for consistent display
   */
  private formatModule(module: string): string {
    return `${colors.cyan}[${module.toUpperCase()}]${colors.reset}`;
  }

  /**
   * Get timestamp string
   */
  private getTimestamp(): string {
    const now = new Date();
    return `${colors.gray}${now.toISOString().split("T")[1].slice(0, 8)}${colors.reset}`;
  }

  // ==================== LOGGING METHODS ====================

  /**
   * Check if a log should be redirected to a live task
   * Returns true if the log was handled by a live task
   */
  private tryLogToLiveTask(module: string, message: string, status: "info" | "success" | "warn" | "error"): boolean {
    if (this.liveConsole?.hasActiveTask?.(module)) {
      return this.liveConsole.addStepToTask(module, message, status);
    }
    return false;
  }

  /**
   * Log an info message
   * If module has an active live task, logs as step in that task
   * If module is aliased to a parent group, logs as groupItem instead
   */
  info(module: string, message: string, ...args: any[]) {
    if (!this.shouldLog("info")) return;
    // Try live task first
    if (this.tryLogToLiveTask(module, message, "info")) return;
    // Then try buffered group
    const parentGroup = this.getParentGroup(module);
    if (parentGroup) {
      this.groupItem(parentGroup, message, "info");
      return;
    }
    console.log(
      `${this.getTimestamp()} ${this.formatModule(module)} ${colors.blue}${icons.info}${colors.reset}  ${message}`,
      ...args
    );
  }

  /**
   * Log a success message
   * If module has an active live task, logs as step in that task
   * If module is aliased to a parent group, logs as groupItem instead
   */
  success(module: string, message: string, ...args: any[]) {
    if (!this.shouldLog("info")) return;
    // Try live task first
    if (this.tryLogToLiveTask(module, message, "success")) return;
    // Then try buffered group
    const parentGroup = this.getParentGroup(module);
    if (parentGroup) {
      this.groupItem(parentGroup, message, "success");
      return;
    }
    console.log(
      `${this.getTimestamp()} ${this.formatModule(module)} ${colors.green}${icons.success}${colors.reset}  ${message}`,
      ...args
    );
  }

  /**
   * Log a warning message
   * If module has an active live task, logs as step in that task
   * If module is aliased to a parent group, logs as groupItem instead
   */
  warn(module: string, message: string, ...args: any[]) {
    if (!this.shouldLog("warn")) return;
    // Try live task first
    if (this.tryLogToLiveTask(module, message, "warn")) return;
    // Then try buffered group
    const parentGroup = this.getParentGroup(module);
    if (parentGroup) {
      this.groupItem(parentGroup, message, "warn");
      return;
    }
    console.warn(
      `${this.getTimestamp()} ${this.formatModule(module)} ${colors.yellow}${icons.warning}${colors.reset}  ${colors.yellow}${message}${colors.reset}`,
      ...args
    );
  }

  /**
   * Log an error message (single line with optional error details inline)
   * If module has an active live task, logs as step in that task
   * If module is aliased to a parent group, logs as groupItem instead
   */
  error(module: string, message: string, error?: Error | any) {
    if (!this.shouldLog("error")) return;
    let errorDetail = "";
    if (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Only add detail if it's different from the message
      if (errorMsg && errorMsg !== message && !message.includes(errorMsg)) {
        errorDetail = `: ${errorMsg}`;
      }
    }
    const fullMessage = `${message}${errorDetail}`;
    // Try live task first
    if (this.tryLogToLiveTask(module, fullMessage, "error")) return;
    // Then try buffered group
    const parentGroup = this.getParentGroup(module);
    if (parentGroup) {
      this.groupItem(parentGroup, fullMessage, "error");
      return;
    }
    console.error(
      `${this.getTimestamp()} ${this.formatModule(module)} ${colors.red}${icons.error}${colors.reset}  ${colors.red}${fullMessage}${colors.reset}`
    );
    // Only show stack trace in debug mode
    if (error instanceof Error && error.stack && this.level === "debug") {
      console.error(`${colors.dim}${error.stack}${colors.reset}`);
    }
  }

  /**
   * Log a debug message (only shown when LOG_LEVEL=debug)
   */
  debug(module: string, message: string, ...args: any[]) {
    if (!this.shouldLog("debug")) return;
    console.log(
      `${this.getTimestamp()} ${this.formatModule(module)} ${colors.gray}${icons.debug}${colors.reset}  ${colors.dim}${message}${colors.reset}`,
      ...args
    );
  }

  /**
   * Log a progress step
   */
  step(module: string, current: number, total: number, message: string) {
    if (!this.shouldLog("info")) return;
    const percent = Math.round((current / total) * 100);
    const bar = this.progressBar(percent, 20);
    console.log(
      `${this.getTimestamp()} ${this.formatModule(module)} ${bar} ${colors.dim}${current}/${total}${colors.reset} ${message}`
    );
  }

  // ==================== TASK GROUPING METHODS ====================

  /**
   * Start a new task group - shows arrow with task name
   * Use for long-running operations that will have multiple status updates
   */
  task(module: string, taskName: string) {
    if (!this.shouldLog("info")) return;
    const key = `${module}:${taskName}`;
    this.taskTimers.set(key, Date.now());
    this.activeTasks.add(key);
    console.log(
      `${this.getTimestamp()} ${this.formatModule(module)} ${colors.cyan}${icons.arrow}${colors.reset}  ${colors.bold}${taskName}${colors.reset}`
    );
  }

  /**
   * Update the current task with a status message
   * Shows indented status under the task header
   */
  taskUpdate(module: string, taskName: string, message: string, status: "info" | "success" | "warn" | "error" = "info") {
    if (!this.shouldLog("info")) return;
    const key = `${module}:${taskName}`;
    if (!this.activeTasks.has(key)) {
      // Auto-start task if not started
      this.task(module, taskName);
    }

    let icon: string;
    let color: string;
    switch (status) {
      case "success":
        icon = icons.success;
        color = colors.green;
        break;
      case "warn":
        icon = icons.warning;
        color = colors.yellow;
        break;
      case "error":
        icon = icons.error;
        color = colors.red;
        break;
      default:
        icon = icons.bullet;
        color = colors.dim;
    }

    console.log(
      `${this.getTimestamp()} ${" ".repeat(module.length + 2)}   ${color}${icon}${colors.reset}  ${colors.dim}${message}${colors.reset}`
    );
  }

  /**
   * End a task group with final status
   */
  taskEnd(module: string, taskName: string, message?: string, success: boolean = true) {
    if (!this.shouldLog("info")) return;
    const key = `${module}:${taskName}`;
    const startTime = this.taskTimers.get(key);
    const duration = startTime ? Date.now() - startTime : 0;
    const timeStr = duration > 0 ? ` ${colors.gray}(${this.formatDuration(duration)})${colors.reset}` : "";

    const icon = success ? icons.success : icons.error;
    const color = success ? colors.green : colors.red;
    const finalMessage = message || (success ? "Done" : "Failed");

    console.log(
      `${this.getTimestamp()} ${" ".repeat(module.length + 2)}   ${color}${icon}${colors.reset}  ${finalMessage}${timeStr}`
    );

    this.taskTimers.delete(key);
    this.activeTasks.delete(key);
  }

  /**
   * Create a visual progress bar
   */
  private progressBar(percent: number, width: number = 20): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return `${colors.green}${"█".repeat(filled)}${colors.gray}${"░".repeat(empty)}${colors.reset}`;
  }

  // ==================== GROUP LOGGING METHODS ====================
  // Use these for initialization/startup tasks that have multiple sequential log messages
  // Now uses live animated spinners for real-time feedback

  // Map to store live task handles for group operations
  private liveGroupHandles: Map<string, LiveTaskHandle> = new Map();

  /**
   * Start a grouped section for initialization tasks
   * Uses live animated spinner for real-time feedback
   */
  group(module: string, title: string) {
    if (!this.shouldLog("info")) return;

    // Start a live task for this group
    const handle = this.live(module, title);
    this.liveGroupHandles.set(module, handle);

    // Also track in activeGroups for compatibility
    this.activeGroups.set(module, {
      module,
      title,
      startTime: Date.now(),
      items: []
    });
  }

  /**
   * Add an item to a grouped section - shows as a step in the live spinner
   */
  groupItem(module: string, message: string, status: "info" | "success" | "warn" | "error" = "info") {
    if (!this.shouldLog("info")) return;

    const handle = this.liveGroupHandles.get(module);
    if (handle) {
      handle.step(message, status);
    }

    // Also track in activeGroups for compatibility
    const group = this.activeGroups.get(module);
    if (group) {
      group.items.push({ message, status });
    }
  }

  /**
   * End a grouped section - completes the live spinner task
   */
  groupEnd(module: string, message?: string, success: boolean = true) {
    if (!this.shouldLog("info")) return;

    const handle = this.liveGroupHandles.get(module);
    if (handle) {
      if (success) {
        handle.succeed(message);
      } else {
        handle.fail(message);
      }
      this.liveGroupHandles.delete(module);
    }

    this.activeGroups.delete(module);
  }

  /**
   * Check if a module currently has an active group
   */
  hasActiveGroup(module: string): boolean {
    return this.activeGroups.has(module);
  }

  /**
   * Register a child module to log as part of a parent's group
   * When child module logs, it will appear as groupItem in parent's group
   * Example: logger.registerGroupAlias("BTC_NODE", "BTC_SCAN")
   */
  registerGroupAlias(childModule: string, parentModule: string) {
    this.moduleGroupAliases.set(childModule, parentModule);
  }

  /**
   * Unregister a group alias
   */
  unregisterGroupAlias(childModule: string) {
    this.moduleGroupAliases.delete(childModule);
  }

  /**
   * Get the parent group module for a given module (if aliased)
   */
  private getParentGroup(module: string): string | null {
    const parentModule = this.moduleGroupAliases.get(module);
    if (parentModule && this.activeGroups.has(parentModule)) {
      return parentModule;
    }
    return null;
  }

  // ==================== LIVE ANIMATED TASKS ====================
  // Real-time spinners and progress for long-running operations

  private liveConsole: any = null;
  private liveConsoleLoaded = false;

  /**
   * Register a child module to log as part of a parent's live task
   * When child module logs (via info, error, etc.), it will appear as a step in parent's task
   * Example: logger.registerLiveAlias("BTC_NODE", "BTC_SCAN")
   */
  registerLiveAlias(childModule: string, parentModule: string) {
    this.ensureLiveConsoleLoaded();
    if (this.liveConsole?.registerAlias) {
      this.liveConsole.registerAlias(childModule, parentModule);
    }
    // Also register for buffered groups as fallback
    this.registerGroupAlias(childModule, parentModule);
  }

  /**
   * Unregister a live alias
   */
  unregisterLiveAlias(childModule: string) {
    if (this.liveConsole?.unregisterAlias) {
      this.liveConsole.unregisterAlias(childModule);
    }
    this.unregisterGroupAlias(childModule);
  }

  /**
   * Ensure live console is loaded (lazy loading)
   */
  private ensureLiveConsoleLoaded() {
    if (!this.liveConsoleLoaded) {
      try {
        this.liveConsole = require("./live-console").liveConsole;
      } catch {
        this.liveConsole = null;
      }
      this.liveConsoleLoaded = true;
    }
  }

  /**
   * Start a live animated task with spinner
   * Falls back to regular group logging if terminal doesn't support live updates
   *
   * @example
   * const task = logger.live("BTC_SCAN", "Starting scanner...");
   * task.step("Connecting...");
   * task.progress(50, "Syncing...");
   * task.succeed("Ready!");
   */
  live(module: string, title: string): LiveTaskHandle {
    this.ensureLiveConsoleLoaded();

    // Use live console if available and TTY is supported
    if (this.liveConsole?.enabled) {
      const handle = this.liveConsole.startTask(module, title);
      return {
        step: (message: string, status?: "info" | "success" | "warn" | "error") => {
          handle.step(message, status || "info");
        },
        progress: (percent: number, message?: string) => {
          handle.update(message || title, { progress: percent });
        },
        succeed: (message?: string) => handle.succeed(message || "Done"),
        fail: (message?: string) => handle.fail(message),
        warn: (message?: string) => handle.warn(message || "Warning"),
        setRequest: (method: string, url: string) => handle.setRequest(method, url),
      };
    }

    // Fallback to simple static logging (non-TTY environment like production)
    // We use direct logging here instead of group() to avoid infinite recursion
    const startTime = Date.now();
    console.log(
      `${this.getTimestamp()} ${this.formatModule(module)} ${colors.cyan}${icons.arrow}${colors.reset}  ${title}`
    );

    const indent = " ".repeat(module.length + 12);

    return {
      step: (message: string, status?: "info" | "success" | "warn" | "error") => {
        let icon = icons.bullet;
        let color = colors.dim;
        if (status === "success") { icon = icons.success; color = colors.green; }
        else if (status === "warn") { icon = icons.warning; color = colors.yellow; }
        else if (status === "error") { icon = icons.error; color = colors.red; }
        console.log(`${indent}├─ ${color}${icon}${colors.reset} ${colors.dim}${message}${colors.reset}`);
      },
      progress: (percent: number, message?: string) => {
        if (message) {
          console.log(`${indent}├─ ${colors.dim}${icons.bullet}${colors.reset} ${colors.dim}${message} (${percent}%)${colors.reset}`);
        }
      },
      succeed: (message?: string) => {
        const duration = this.formatDuration(Date.now() - startTime);
        console.log(`${indent}└─ ${colors.green}${icons.success}${colors.reset} ${colors.green}${message || "Done"}${colors.reset} ${colors.gray}(${duration})${colors.reset}`);
      },
      fail: (message?: string) => {
        const duration = this.formatDuration(Date.now() - startTime);
        console.log(`${indent}└─ ${colors.red}${icons.error}${colors.reset} ${colors.red}${message || "Failed"}${colors.reset} ${colors.gray}(${duration})${colors.reset}`);
      },
      warn: (message?: string) => {
        const duration = this.formatDuration(Date.now() - startTime);
        console.log(`${indent}└─ ${colors.yellow}${icons.warning}${colors.reset} ${colors.yellow}${message || "Warning"}${colors.reset} ${colors.gray}(${duration})${colors.reset}`);
      },
      setRequest: () => {}, // No-op for fallback (non-TTY)
    };
  }

  // ==================== STARTUP/BANNER METHODS ====================

  /**
   * Print the startup banner
   */
  banner(name: string, version: string, env: string) {
    const width = 50;
    const line = box.horizontal.repeat(width - 2);

    console.log("");
    console.log(`${colors.cyan}${box.topLeft}${line}${box.topRight}${colors.reset}`);
    console.log(
      `${colors.cyan}${box.vertical}${colors.reset}${this.center(
        ` ${icons.rocket} ${colors.bold}${colors.brightCyan}${name}${colors.reset} `,
        width - 2
      )}${colors.cyan}${box.vertical}${colors.reset}`
    );
    console.log(
      `${colors.cyan}${box.vertical}${colors.reset}${this.center(
        `${colors.gray}v${version} • ${env}${colors.reset}`,
        width - 2
      )}${colors.cyan}${box.vertical}${colors.reset}`
    );
    console.log(`${colors.cyan}${box.bottomLeft}${line}${box.bottomRight}${colors.reset}`);
    console.log("");
  }

  /**
   * Start a new section with a header
   */
  section(title: string) {
    this.sectionTimers.set(title, Date.now());
    console.log(`${colors.cyan}${icons.arrow}${colors.reset} ${colors.bold}${title}${colors.reset}`);
  }

  /**
   * End a section and show timing
   */
  sectionEnd(title: string, details?: string) {
    const startTime = this.sectionTimers.get(title);
    const duration = startTime ? Date.now() - startTime : 0;
    const timeStr = this.formatDuration(duration);

    if (details) {
      console.log(
        `  ${colors.green}${icons.success}${colors.reset} ${colors.dim}${details}${colors.reset} ${colors.gray}(${timeStr})${colors.reset}`
      );
    } else {
      console.log(
        `  ${colors.green}${icons.success}${colors.reset} ${colors.dim}Done${colors.reset} ${colors.gray}(${timeStr})${colors.reset}`
      );
    }
  }

  /**
   * Print a timing breakdown
   */
  timings(items: { name: string; ms: number }[]) {
    const parts = items.map((item) => {
      const timeStr = this.formatDuration(item.ms);
      return `${colors.dim}${item.name}${colors.reset} ${colors.gray}${timeStr}${colors.reset}`;
    });
    console.log(`  ${colors.gray}${box.teeRight}${box.horizontal}${colors.reset} ${parts.join(` ${colors.gray}│${colors.reset} `)}`);
  }

  /**
   * Print the final ready message
   */
  ready(port: number, startTime?: number) {
    const duration = startTime ? Date.now() - startTime : 0;
    const timeStr = duration > 0 ? ` ${colors.gray}(${this.formatDuration(duration)})${colors.reset}` : "";
    console.log("");
    console.log(
      `${colors.green}${icons.success}${colors.reset} ${colors.bold}${colors.green}Server ready${colors.reset} ${colors.dim}on port${colors.reset} ${colors.cyan}${port}${colors.reset}${timeStr}`
    );
    console.log("");
  }

  /**
   * Print initialization complete message
   */
  initialized(thread: string, totalMs: number, stats: { extensions: number; crons: number; routes?: number }) {
    const statsStr = [
      stats.extensions > 0 ? `${stats.extensions} extensions` : null,
      stats.crons > 0 ? `${stats.crons} crons` : null,
      stats.routes ? `${stats.routes} routes` : null,
    ]
      .filter(Boolean)
      .join(" │ ");

    console.log(`  ${colors.gray}${box.bottomLeft}${box.horizontal}${colors.reset} ${colors.dim}${statsStr}${colors.reset}`);
    console.log("");
  }

  /**
   * Empty line
   */
  newline() {
    console.log("");
  }

  // ==================== TABLE/DATA METHODS ====================

  /**
   * Log a key-value pair
   */
  kv(module: string, key: string, value: any) {
    if (!this.shouldLog("info")) return;
    console.log(
      `${this.getTimestamp()} ${this.formatModule(module)} ${colors.dim}${key}:${colors.reset} ${value}`
    );
  }

  /**
   * Log multiple key-value pairs
   */
  kvMultiple(module: string, data: Record<string, any>) {
    if (!this.shouldLog("info")) return;
    console.log(`${this.getTimestamp()} ${this.formatModule(module)}`);
    for (const [key, value] of Object.entries(data)) {
      console.log(`  ${colors.gray}${icons.bullet}${colors.reset} ${colors.dim}${key}:${colors.reset} ${value}`);
    }
  }

  /**
   * Log a table of data
   */
  table(module: string, data: Record<string, any>[], columns?: string[]) {
    if (!this.shouldLog("info")) return;
    console.log(`${this.getTimestamp()} ${this.formatModule(module)}`);
    console.table(data, columns);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Center text in a given width (accounting for ANSI codes)
   */
  private center(text: string, width: number): string {
    const actualLength = text.replace(/\x1b\[[0-9;]*m/g, "").length;
    const padding = Math.max(0, width - actualLength);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return " ".repeat(leftPad) + text + " ".repeat(rightPad);
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const mins = Math.floor(ms / 60000);
      const secs = ((ms % 60000) / 1000).toFixed(0);
      return `${mins}m ${secs}s`;
    }
  }
}

// ==================== SINGLETON EXPORTS ====================

// Main logger instance
export const logger = new Logger();

// Startup console helper (for banner/sections during startup)
export const console$ = logger;

// Default export for convenience
export default logger;

// ==================== QUICK LOG FUNCTIONS ====================
// These can be imported directly for quick usage

export const logInfo = (module: string, message: string, ...args: any[]) =>
  logger.info(module, message, ...args);

export const logSuccess = (module: string, message: string, ...args: any[]) =>
  logger.success(module, message, ...args);

export const logWarn = (module: string, message: string, ...args: any[]) =>
  logger.warn(module, message, ...args);

export const logError = (module: string, message: string, error?: Error | any) =>
  logger.error(module, message, error);

export const logDebug = (module: string, message: string, ...args: any[]) =>
  logger.debug(module, message, ...args);
