/**
 * Live Terminal Console
 * Provides animated spinners, live progress bars, and dynamic status updates
 *
 * IMPORTANT: This module now routes all output through logQueue to prevent
 * conflicts with buffered group logging.
 *
 * Usage:
 *   import { liveConsole } from "@b/utils/console";
 *
 *   // Start a live task with spinner
 *   const task = liveConsole.startTask("BTC_SCAN", "Starting Bitcoin scanner...");
 *   task.update("Connecting to node...");
 *   task.update("Syncing blocks...", { progress: 50 });
 *   task.succeed("Scanner ready!");
 *   // or task.fail("Connection failed");
 *
 *   // Multiple concurrent tasks
 *   const task1 = liveConsole.startTask("DB", "Connecting to database...");
 *   const task2 = liveConsole.startTask("CACHE", "Warming cache...");
 *   task1.succeed("Connected");
 *   task2.succeed("Cache ready");
 */

import cliSpinners from "cli-spinners";
import { colors, icons } from "./colors";
import { logQueue } from "./log-queue";

// Spinner frames for different states
const SPINNERS = {
  dots: cliSpinners.dots,
  dots2: cliSpinners.dots2,
  dots3: cliSpinners.dots3,
  dots12: cliSpinners.dots12,
  line: cliSpinners.line,
  arc: cliSpinners.arc,
  bouncingBar: cliSpinners.bouncingBar,
  bouncingBall: cliSpinners.bouncingBall,
  pulse: cliSpinners.moon,
  aesthetic: cliSpinners.aesthetic,
};

// Progress bar characters
const PROGRESS_CHARS = {
  filled: "█",
  empty: "░",
  head: "▓",
};

interface LiveTask {
  id: string;
  module: string;
  title: string;
  status: "running" | "success" | "error" | "warn";
  message: string;
  progress?: number;
  startTime: number;
  steps: Array<{ message: string; status: "info" | "success" | "warn" | "error"; time: number }>;
  spinnerFrame: number;
  /** Optional request metadata (method, url) */
  request?: { method: string; url: string };
}

export interface LiveTaskHandle {
  update: (message: string, options?: { progress?: number; status?: "info" | "success" | "warn" | "error" }) => void;
  step: (message: string, status?: "info" | "success" | "warn" | "error") => void;
  succeed: (message?: string) => void;
  fail: (message?: string) => void;
  warn: (message?: string) => void;
  /** Set request metadata (method, url) to display */
  setRequest: (method: string, url: string) => void;
}

class LiveConsole {
  private tasks: Map<string, LiveTask> = new Map();
  private renderInterval: ReturnType<typeof setInterval> | null = null;
  private spinner = SPINNERS.dots12;
  private isEnabled: boolean;
  private frameCount = 0;
  // Maps child modules to their parent task module (e.g., "BTC_NODE" -> "BTC_SCAN")
  private moduleAliases: Map<string, string> = new Map();
  // Maps module names to their active task IDs
  private activeModuleTasks: Map<string, string> = new Map();

  constructor() {
    // Disable in non-TTY environments (like CI, piped output)
    this.isEnabled = process.stdout.isTTY === true;
  }

  /**
   * Check if live console is available
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Register a child module to log as part of a parent's live task
   * When child module logs, it will appear as a step in parent's task
   * Example: registerAlias("BTC_NODE", "BTC_SCAN")
   */
  registerAlias(childModule: string, parentModule: string) {
    this.moduleAliases.set(childModule.toUpperCase(), parentModule.toUpperCase());
  }

  /**
   * Unregister a module alias
   */
  unregisterAlias(childModule: string) {
    this.moduleAliases.delete(childModule.toUpperCase());
  }

  /**
   * Check if a module has an active live task (directly or via alias)
   */
  hasActiveTask(module: string): boolean {
    const upperModule = module.toUpperCase();
    // Direct task check
    if (this.activeModuleTasks.has(upperModule)) {
      return true;
    }
    // Check via alias
    const parentModule = this.moduleAliases.get(upperModule);
    if (parentModule && this.activeModuleTasks.has(parentModule)) {
      return true;
    }
    return false;
  }

  /**
   * Add a step to a live task by module name (supports aliases)
   * Returns true if the step was added to a task, false otherwise
   */
  addStepToTask(module: string, message: string, status: "info" | "success" | "warn" | "error" = "info"): boolean {
    const upperModule = module.toUpperCase();

    // Try direct module first
    let taskId = this.activeModuleTasks.get(upperModule);

    // If not found, try via alias
    if (!taskId) {
      const parentModule = this.moduleAliases.get(upperModule);
      if (parentModule) {
        taskId = this.activeModuleTasks.get(parentModule);
      }
    }

    if (!taskId) return false;

    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.steps.push({ message, status, time: Date.now() });
    task.message = message;
    return true;
  }

  /**
   * Start a new live task with animated spinner
   */
  startTask(module: string, title: string): LiveTaskHandle {
    const id = `${module}-${Date.now()}`;
    const upperModule = module.toUpperCase();

    const task: LiveTask = {
      id,
      module: upperModule,
      title,
      status: "running",
      message: title,
      startTime: Date.now(),
      steps: [],
      spinnerFrame: 0,
    };

    this.tasks.set(id, task);
    this.activeModuleTasks.set(upperModule, id);

    // Notify log queue that live mode is starting
    logQueue.liveStart();

    this.startRendering();

    return {
      update: (message: string, options?: { progress?: number; status?: "info" | "success" | "warn" | "error" }) => {
        this.updateTask(id, message, options);
      },
      step: (message: string, status: "info" | "success" | "warn" | "error" = "info") => {
        this.addStep(id, message, status);
      },
      succeed: (message?: string) => {
        this.completeTask(id, "success", message);
      },
      fail: (message?: string) => {
        this.completeTask(id, "error", message);
      },
      warn: (message?: string) => {
        this.completeTask(id, "warn", message);
      },
      setRequest: (method: string, url: string) => {
        const task = this.tasks.get(id);
        if (task) {
          task.request = { method, url };
        }
      },
    };
  }

  /**
   * Update a task's current message
   */
  private updateTask(id: string, message: string, options?: { progress?: number; status?: "info" | "success" | "warn" | "error" }) {
    const task = this.tasks.get(id);
    if (!task) return;

    task.message = message;
    if (options?.progress !== undefined) {
      task.progress = Math.min(100, Math.max(0, options.progress));
    }
  }

  /**
   * Add a step to a task's history
   */
  private addStep(id: string, message: string, status: "info" | "success" | "warn" | "error") {
    const task = this.tasks.get(id);
    if (!task) return;

    task.steps.push({ message, status, time: Date.now() });
    task.message = message;
  }

  /**
   * Complete a task with final status
   */
  private completeTask(id: string, status: "success" | "error" | "warn", message?: string) {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = status;
    if (message) {
      task.message = message;
    }

    // Build final output atomically
    const finalOutput = this.buildFinalTaskOutput(task);

    // Remove task from active tracking
    this.tasks.delete(id);
    this.activeModuleTasks.delete(task.module);

    // Stop rendering if no more tasks
    if (this.tasks.size === 0) {
      this.stopRendering();
    }

    // Notify log queue that this task is done, with final output
    logQueue.liveDone(finalOutput);
  }

  /**
   * Build the final output string for a completed task
   * If task has steps, show full detailed output with all steps
   * If no steps, show minimal single line
   */
  private buildFinalTaskOutput(task: LiveTask): string {
    const timestamp = this.getTimestamp();
    // task.message contains duration in ms when passed from api-logger
    const durationMs = parseInt(task.message, 10);
    const duration = !isNaN(durationMs) ? this.formatDuration(durationMs) : this.formatDuration(Date.now() - task.startTime);

    // If no steps, show minimal single-line output
    if (task.steps.length === 0) {
      const icon = this.getStatusIcon(task.status);
      const color = this.getStatusColor(task.status);
      const taskName = task.title.replace(/\.\.\.?$/, "");
      return `${timestamp} ${icon} ${color}${taskName}${colors.reset} ${colors.gray}(${duration})${colors.reset}`;
    }

    // Has steps - show full detailed output
    const lines: string[] = [];
    const indent = " ".repeat(task.module.length + 12);

    // Header line with request info if available
    if (task.request) {
      const method = task.request.method.toUpperCase();
      const methodColor = method === "GET" ? colors.green
        : method === "POST" ? colors.yellow
        : method === "PUT" ? colors.blue
        : method === "DELETE" ? colors.red
        : colors.cyan;
      lines.push(
        `${timestamp} ${colors.cyan}[${task.module}]${colors.reset} ${colors.cyan}▶${colors.reset}  ${methodColor}${method}${colors.reset} ${colors.white}${task.request.url}${colors.reset}`
      );
      lines.push(
        `${indent}├─ ${colors.dim}${task.title}${colors.reset}`
      );
    } else {
      lines.push(
        `${timestamp} ${colors.cyan}[${task.module}]${colors.reset} ${colors.cyan}▶${colors.reset}  ${task.title}`
      );
    }

    // Check if last step should be the final line (success, error, or warning)
    const lastStep = task.steps[task.steps.length - 1];
    const lastStepIsFinal = lastStep && (lastStep.status === "success" || lastStep.status === "error" || lastStep.status === "warn");

    // All steps except the last one (which becomes the final line)
    const stepsToShow = lastStepIsFinal ? task.steps.slice(0, -1) : task.steps;
    for (const step of stepsToShow) {
      let icon = "";
      let color = colors.dim;
      switch (step.status) {
        case "success":
          icon = `${colors.green}${icons.success}${colors.reset} `;
          break;
        case "warn":
          icon = `${colors.yellow}${icons.warning}${colors.reset} `;
          color = colors.yellow;
          break;
        case "error":
          icon = `${colors.red}${icons.error}${colors.reset} `;
          color = colors.red;
          break;
      }
      lines.push(`${indent}├─ ${icon}${color}${step.message}${colors.reset}`);
    }

    // Final status line - use last step if it has a status, otherwise show generic message
    const finalIcon = this.getStatusIcon(task.status);
    const finalColor = task.status === "success" ? colors.green : task.status === "error" ? colors.red : colors.yellow;
    let finalMsg: string;
    if (lastStepIsFinal) {
      // Use the last step's message as the final line
      finalMsg = lastStep.message;
    } else {
      // Fallback for tasks without proper final step
      finalMsg = task.status === "success" ? "Completed" : "Failed";
    }
    lines.push(`${indent}└─ ${finalIcon} ${finalColor}${finalMsg}${colors.reset} ${colors.gray}(${duration})${colors.reset}`);

    return lines.join("\n");
  }

  /**
   * Start the render loop
   */
  private startRendering() {
    if (this.renderInterval || !this.isEnabled) return;

    this.renderInterval = setInterval(() => {
      this.frameCount++;
      this.render();
    }, this.spinner.interval);
  }

  /**
   * Stop the render loop
   */
  private stopRendering() {
    if (this.renderInterval) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
    }
    // Don't call logUpdate directly - let logQueue handle it
  }

  /**
   * Render all active tasks via logQueue
   */
  private render() {
    if (this.tasks.size === 0) return;

    const lines: string[] = [];

    for (const task of this.tasks.values()) {
      lines.push(...this.renderTask(task));
    }

    // Route through logQueue to prevent conflicts
    logQueue.liveUpdate(lines.join("\n"));
  }

  /**
   * Render a single task - shows header, all completed steps, and current step with spinner
   */
  private renderTask(task: LiveTask): string[] {
    const timestamp = this.getTimestamp();
    const duration = this.formatDuration(Date.now() - task.startTime);
    const indent = " ".repeat(task.module.length + 12);

    // Get spinner frame
    const spinnerFrame = this.spinner.frames[this.frameCount % this.spinner.frames.length];

    const lines: string[] = [];

    // Header line with module and title
    lines.push(
      `${timestamp} ${colors.cyan}[${task.module}]${colors.reset} ${colors.cyan}▶${colors.reset}  ${task.title}`
    );

    // Show all completed steps (all but the last one which is the current step)
    const completedSteps = task.steps.slice(0, -1);
    for (const step of completedSteps) {
      let icon = "";
      let color = colors.dim;
      switch (step.status) {
        case "success":
          icon = `${colors.green}${icons.success}${colors.reset} `;
          break;
        case "warn":
          icon = `${colors.yellow}${icons.warning}${colors.reset} `;
          color = colors.yellow;
          break;
        case "error":
          icon = `${colors.red}${icons.error}${colors.reset} `;
          color = colors.red;
          break;
      }
      lines.push(`${indent}├─ ${icon}${color}${step.message}${colors.reset}`);
    }

    // Show current step with spinner (the last step)
    if (task.steps.length > 0) {
      const currentStep = task.steps[task.steps.length - 1];
      const spinnerStr = `${colors.cyan}${spinnerFrame}${colors.reset}`;
      lines.push(`${indent}├─ ${spinnerStr} ${colors.dim}${currentStep.message}${colors.reset} ${colors.gray}${duration}${colors.reset}`);
    } else {
      // No steps yet, show spinner on title line
      const spinnerStr = `${colors.cyan}${spinnerFrame}${colors.reset}`;
      lines.push(`${indent}└─ ${spinnerStr} ${colors.dim}Initializing...${colors.reset} ${colors.gray}${duration}${colors.reset}`);
    }

    return lines;
  }

  /**
   * Render a progress bar
   */
  private renderProgressBar(percent: number, width: number): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;

    const filledStr = PROGRESS_CHARS.filled.repeat(Math.max(0, filled - 1));
    const headStr = filled > 0 ? PROGRESS_CHARS.head : "";
    const emptyStr = PROGRESS_CHARS.empty.repeat(empty);

    return `${colors.green}${filledStr}${headStr}${colors.gray}${emptyStr}${colors.reset}`;
  }

  /**
   * Get status icon
   */
  private getStatusIcon(status: "running" | "success" | "error" | "warn"): string {
    switch (status) {
      case "success": return `${colors.green}${icons.success}${colors.reset}`;
      case "error": return `${colors.red}${icons.error}${colors.reset}`;
      case "warn": return `${colors.yellow}${icons.warning}${colors.reset}`;
      default: return `${colors.cyan}●${colors.reset}`;
    }
  }

  /**
   * Get step icon
   */
  private getStepIcon(status: "info" | "success" | "warn" | "error"): string {
    switch (status) {
      case "success": return `${colors.green}${icons.success}${colors.reset}`;
      case "error": return `${colors.red}${icons.error}${colors.reset}`;
      case "warn": return `${colors.yellow}${icons.warning}${colors.reset}`;
      default: return `${colors.dim}${icons.bullet}${colors.reset}`;
    }
  }

  /**
   * Get status color
   */
  private getStatusColor(status: "info" | "success" | "warn" | "error" | "running"): string {
    switch (status) {
      case "success": return colors.green;
      case "error": return colors.red;
      case "warn": return colors.yellow;
      case "running": return colors.cyan;
      default: return colors.dim;
    }
  }

  /**
   * Format timestamp
   */
  private getTimestamp(): string {
    const now = new Date();
    return `${colors.gray}${now.toISOString().split("T")[1].slice(0, 8)}${colors.reset}`;
  }

  /**
   * Format module name
   */
  private formatModule(module: string): string {
    return `${colors.cyan}[${module}]${colors.reset}`;
  }

  /**
   * Format duration
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = ((ms % 60000) / 1000).toFixed(0);
    return `${mins}m ${secs}s`;
  }
}

// Export singleton instance
export const liveConsole = new LiveConsole();
export default liveConsole;
