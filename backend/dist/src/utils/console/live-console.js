"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveConsole = void 0;
const cli_spinners_1 = __importDefault(require("cli-spinners"));
const colors_1 = require("./colors");
const log_queue_1 = require("./log-queue");
const SPINNERS = {
    dots: cli_spinners_1.default.dots,
    dots2: cli_spinners_1.default.dots2,
    dots3: cli_spinners_1.default.dots3,
    dots12: cli_spinners_1.default.dots12,
    line: cli_spinners_1.default.line,
    arc: cli_spinners_1.default.arc,
    bouncingBar: cli_spinners_1.default.bouncingBar,
    bouncingBall: cli_spinners_1.default.bouncingBall,
    pulse: cli_spinners_1.default.moon,
    aesthetic: cli_spinners_1.default.aesthetic,
};
const PROGRESS_CHARS = {
    filled: "█",
    empty: "░",
    head: "▓",
};
class LiveConsole {
    constructor() {
        this.tasks = new Map();
        this.renderInterval = null;
        this.spinner = SPINNERS.dots12;
        this.frameCount = 0;
        this.moduleAliases = new Map();
        this.activeModuleTasks = new Map();
        this.isEnabled = process.stdout.isTTY === true;
    }
    get enabled() {
        return this.isEnabled;
    }
    registerAlias(childModule, parentModule) {
        this.moduleAliases.set(childModule.toUpperCase(), parentModule.toUpperCase());
    }
    unregisterAlias(childModule) {
        this.moduleAliases.delete(childModule.toUpperCase());
    }
    hasActiveTask(module) {
        const upperModule = module.toUpperCase();
        if (this.activeModuleTasks.has(upperModule)) {
            return true;
        }
        const parentModule = this.moduleAliases.get(upperModule);
        if (parentModule && this.activeModuleTasks.has(parentModule)) {
            return true;
        }
        return false;
    }
    addStepToTask(module, message, status = "info") {
        const upperModule = module.toUpperCase();
        let taskId = this.activeModuleTasks.get(upperModule);
        if (!taskId) {
            const parentModule = this.moduleAliases.get(upperModule);
            if (parentModule) {
                taskId = this.activeModuleTasks.get(parentModule);
            }
        }
        if (!taskId)
            return false;
        const task = this.tasks.get(taskId);
        if (!task)
            return false;
        task.steps.push({ message, status, time: Date.now() });
        task.message = message;
        return true;
    }
    startTask(module, title) {
        const id = `${module}-${Date.now()}`;
        const upperModule = module.toUpperCase();
        const task = {
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
        log_queue_1.logQueue.liveStart();
        this.startRendering();
        return {
            update: (message, options) => {
                this.updateTask(id, message, options);
            },
            step: (message, status = "info") => {
                this.addStep(id, message, status);
            },
            succeed: (message) => {
                this.completeTask(id, "success", message);
            },
            fail: (message) => {
                this.completeTask(id, "error", message);
            },
            warn: (message) => {
                this.completeTask(id, "warn", message);
            },
            setRequest: (method, url) => {
                const task = this.tasks.get(id);
                if (task) {
                    task.request = { method, url };
                }
            },
        };
    }
    updateTask(id, message, options) {
        const task = this.tasks.get(id);
        if (!task)
            return;
        task.message = message;
        if ((options === null || options === void 0 ? void 0 : options.progress) !== undefined) {
            task.progress = Math.min(100, Math.max(0, options.progress));
        }
    }
    addStep(id, message, status) {
        const task = this.tasks.get(id);
        if (!task)
            return;
        task.steps.push({ message, status, time: Date.now() });
        task.message = message;
    }
    completeTask(id, status, message) {
        const task = this.tasks.get(id);
        if (!task)
            return;
        task.status = status;
        if (message) {
            task.message = message;
        }
        const finalOutput = this.buildFinalTaskOutput(task);
        this.tasks.delete(id);
        this.activeModuleTasks.delete(task.module);
        if (this.tasks.size === 0) {
            this.stopRendering();
        }
        log_queue_1.logQueue.liveDone(finalOutput);
    }
    buildFinalTaskOutput(task) {
        const timestamp = this.getTimestamp();
        const durationMs = parseInt(task.message, 10);
        const duration = !isNaN(durationMs) ? this.formatDuration(durationMs) : this.formatDuration(Date.now() - task.startTime);
        if (task.steps.length === 0) {
            const icon = this.getStatusIcon(task.status);
            const color = this.getStatusColor(task.status);
            const taskName = task.title.replace(/\.\.\.?$/, "");
            return `${timestamp} ${icon} ${color}${taskName}${colors_1.colors.reset} ${colors_1.colors.gray}(${duration})${colors_1.colors.reset}`;
        }
        const lines = [];
        const indent = " ".repeat(task.module.length + 12);
        if (task.request) {
            const method = task.request.method.toUpperCase();
            const methodColor = method === "GET" ? colors_1.colors.green
                : method === "POST" ? colors_1.colors.yellow
                    : method === "PUT" ? colors_1.colors.blue
                        : method === "DELETE" ? colors_1.colors.red
                            : colors_1.colors.cyan;
            lines.push(`${timestamp} ${colors_1.colors.cyan}[${task.module}]${colors_1.colors.reset} ${colors_1.colors.cyan}▶${colors_1.colors.reset}  ${methodColor}${method}${colors_1.colors.reset} ${colors_1.colors.white}${task.request.url}${colors_1.colors.reset}`);
            lines.push(`${indent}├─ ${colors_1.colors.dim}${task.title}${colors_1.colors.reset}`);
        }
        else {
            lines.push(`${timestamp} ${colors_1.colors.cyan}[${task.module}]${colors_1.colors.reset} ${colors_1.colors.cyan}▶${colors_1.colors.reset}  ${task.title}`);
        }
        const lastStep = task.steps[task.steps.length - 1];
        const lastStepIsFinal = lastStep && (lastStep.status === "success" || lastStep.status === "error" || lastStep.status === "warn");
        const stepsToShow = lastStepIsFinal ? task.steps.slice(0, -1) : task.steps;
        for (const step of stepsToShow) {
            let icon = "";
            let color = colors_1.colors.dim;
            switch (step.status) {
                case "success":
                    icon = `${colors_1.colors.green}${colors_1.icons.success}${colors_1.colors.reset} `;
                    break;
                case "warn":
                    icon = `${colors_1.colors.yellow}${colors_1.icons.warning}${colors_1.colors.reset} `;
                    color = colors_1.colors.yellow;
                    break;
                case "error":
                    icon = `${colors_1.colors.red}${colors_1.icons.error}${colors_1.colors.reset} `;
                    color = colors_1.colors.red;
                    break;
            }
            lines.push(`${indent}├─ ${icon}${color}${step.message}${colors_1.colors.reset}`);
        }
        const finalIcon = this.getStatusIcon(task.status);
        const finalColor = task.status === "success" ? colors_1.colors.green : task.status === "error" ? colors_1.colors.red : colors_1.colors.yellow;
        let finalMsg;
        if (lastStepIsFinal) {
            finalMsg = lastStep.message;
        }
        else {
            finalMsg = task.status === "success" ? "Completed" : "Failed";
        }
        lines.push(`${indent}└─ ${finalIcon} ${finalColor}${finalMsg}${colors_1.colors.reset} ${colors_1.colors.gray}(${duration})${colors_1.colors.reset}`);
        return lines.join("\n");
    }
    startRendering() {
        if (this.renderInterval || !this.isEnabled)
            return;
        this.renderInterval = setInterval(() => {
            this.frameCount++;
            this.render();
        }, this.spinner.interval);
    }
    stopRendering() {
        if (this.renderInterval) {
            clearInterval(this.renderInterval);
            this.renderInterval = null;
        }
    }
    render() {
        if (this.tasks.size === 0)
            return;
        const lines = [];
        for (const task of this.tasks.values()) {
            lines.push(...this.renderTask(task));
        }
        log_queue_1.logQueue.liveUpdate(lines.join("\n"));
    }
    renderTask(task) {
        const timestamp = this.getTimestamp();
        const duration = this.formatDuration(Date.now() - task.startTime);
        const indent = " ".repeat(task.module.length + 12);
        const spinnerFrame = this.spinner.frames[this.frameCount % this.spinner.frames.length];
        const lines = [];
        lines.push(`${timestamp} ${colors_1.colors.cyan}[${task.module}]${colors_1.colors.reset} ${colors_1.colors.cyan}▶${colors_1.colors.reset}  ${task.title}`);
        const completedSteps = task.steps.slice(0, -1);
        for (const step of completedSteps) {
            let icon = "";
            let color = colors_1.colors.dim;
            switch (step.status) {
                case "success":
                    icon = `${colors_1.colors.green}${colors_1.icons.success}${colors_1.colors.reset} `;
                    break;
                case "warn":
                    icon = `${colors_1.colors.yellow}${colors_1.icons.warning}${colors_1.colors.reset} `;
                    color = colors_1.colors.yellow;
                    break;
                case "error":
                    icon = `${colors_1.colors.red}${colors_1.icons.error}${colors_1.colors.reset} `;
                    color = colors_1.colors.red;
                    break;
            }
            lines.push(`${indent}├─ ${icon}${color}${step.message}${colors_1.colors.reset}`);
        }
        if (task.steps.length > 0) {
            const currentStep = task.steps[task.steps.length - 1];
            const spinnerStr = `${colors_1.colors.cyan}${spinnerFrame}${colors_1.colors.reset}`;
            lines.push(`${indent}├─ ${spinnerStr} ${colors_1.colors.dim}${currentStep.message}${colors_1.colors.reset} ${colors_1.colors.gray}${duration}${colors_1.colors.reset}`);
        }
        else {
            const spinnerStr = `${colors_1.colors.cyan}${spinnerFrame}${colors_1.colors.reset}`;
            lines.push(`${indent}└─ ${spinnerStr} ${colors_1.colors.dim}Initializing...${colors_1.colors.reset} ${colors_1.colors.gray}${duration}${colors_1.colors.reset}`);
        }
        return lines;
    }
    renderProgressBar(percent, width) {
        const filled = Math.round((percent / 100) * width);
        const empty = width - filled;
        const filledStr = PROGRESS_CHARS.filled.repeat(Math.max(0, filled - 1));
        const headStr = filled > 0 ? PROGRESS_CHARS.head : "";
        const emptyStr = PROGRESS_CHARS.empty.repeat(empty);
        return `${colors_1.colors.green}${filledStr}${headStr}${colors_1.colors.gray}${emptyStr}${colors_1.colors.reset}`;
    }
    getStatusIcon(status) {
        switch (status) {
            case "success": return `${colors_1.colors.green}${colors_1.icons.success}${colors_1.colors.reset}`;
            case "error": return `${colors_1.colors.red}${colors_1.icons.error}${colors_1.colors.reset}`;
            case "warn": return `${colors_1.colors.yellow}${colors_1.icons.warning}${colors_1.colors.reset}`;
            default: return `${colors_1.colors.cyan}●${colors_1.colors.reset}`;
        }
    }
    getStepIcon(status) {
        switch (status) {
            case "success": return `${colors_1.colors.green}${colors_1.icons.success}${colors_1.colors.reset}`;
            case "error": return `${colors_1.colors.red}${colors_1.icons.error}${colors_1.colors.reset}`;
            case "warn": return `${colors_1.colors.yellow}${colors_1.icons.warning}${colors_1.colors.reset}`;
            default: return `${colors_1.colors.dim}${colors_1.icons.bullet}${colors_1.colors.reset}`;
        }
    }
    getStatusColor(status) {
        switch (status) {
            case "success": return colors_1.colors.green;
            case "error": return colors_1.colors.red;
            case "warn": return colors_1.colors.yellow;
            case "running": return colors_1.colors.cyan;
            default: return colors_1.colors.dim;
        }
    }
    getTimestamp() {
        const now = new Date();
        return `${colors_1.colors.gray}${now.toISOString().split("T")[1].slice(0, 8)}${colors_1.colors.reset}`;
    }
    formatModule(module) {
        return `${colors_1.colors.cyan}[${module}]${colors_1.colors.reset}`;
    }
    formatDuration(ms) {
        if (ms < 1000)
            return `${ms}ms`;
        if (ms < 60000)
            return `${(ms / 1000).toFixed(1)}s`;
        const mins = Math.floor(ms / 60000);
        const secs = ((ms % 60000) / 1000).toFixed(0);
        return `${mins}m ${secs}s`;
    }
}
exports.liveConsole = new LiveConsole();
exports.default = exports.liveConsole;
