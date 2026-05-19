"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDebug = exports.logError = exports.logWarn = exports.logSuccess = exports.logInfo = exports.console$ = exports.logger = void 0;
const colors_1 = require("./colors");
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
};
class Logger {
    constructor() {
        var _a;
        this.level = "info";
        this.sectionTimers = new Map();
        this.taskTimers = new Map();
        this.activeTasks = new Set();
        this.activeGroups = new Map();
        this.moduleGroupAliases = new Map();
        this.liveGroupHandles = new Map();
        this.liveConsole = null;
        this.liveConsoleLoaded = false;
        const envLevel = (_a = process.env.LOG_LEVEL) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        if (envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
            this.level = envLevel;
        }
    }
    setLevel(level) {
        this.level = level;
    }
    shouldLog(messageLevel) {
        return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[this.level];
    }
    formatModule(module) {
        return `${colors_1.colors.cyan}[${module.toUpperCase()}]${colors_1.colors.reset}`;
    }
    getTimestamp() {
        const now = new Date();
        return `${colors_1.colors.gray}${now.toISOString().split("T")[1].slice(0, 8)}${colors_1.colors.reset}`;
    }
    tryLogToLiveTask(module, message, status) {
        var _a, _b;
        if ((_b = (_a = this.liveConsole) === null || _a === void 0 ? void 0 : _a.hasActiveTask) === null || _b === void 0 ? void 0 : _b.call(_a, module)) {
            return this.liveConsole.addStepToTask(module, message, status);
        }
        return false;
    }
    info(module, message, ...args) {
        if (!this.shouldLog("info"))
            return;
        if (this.tryLogToLiveTask(module, message, "info"))
            return;
        const parentGroup = this.getParentGroup(module);
        if (parentGroup) {
            this.groupItem(parentGroup, message, "info");
            return;
        }
        console.log(`${this.getTimestamp()} ${this.formatModule(module)} ${colors_1.colors.blue}${colors_1.icons.info}${colors_1.colors.reset}  ${message}`, ...args);
    }
    success(module, message, ...args) {
        if (!this.shouldLog("info"))
            return;
        if (this.tryLogToLiveTask(module, message, "success"))
            return;
        const parentGroup = this.getParentGroup(module);
        if (parentGroup) {
            this.groupItem(parentGroup, message, "success");
            return;
        }
        console.log(`${this.getTimestamp()} ${this.formatModule(module)} ${colors_1.colors.green}${colors_1.icons.success}${colors_1.colors.reset}  ${message}`, ...args);
    }
    warn(module, message, ...args) {
        if (!this.shouldLog("warn"))
            return;
        if (this.tryLogToLiveTask(module, message, "warn"))
            return;
        const parentGroup = this.getParentGroup(module);
        if (parentGroup) {
            this.groupItem(parentGroup, message, "warn");
            return;
        }
        console.warn(`${this.getTimestamp()} ${this.formatModule(module)} ${colors_1.colors.yellow}${colors_1.icons.warning}${colors_1.colors.reset}  ${colors_1.colors.yellow}${message}${colors_1.colors.reset}`, ...args);
    }
    error(module, message, error) {
        if (!this.shouldLog("error"))
            return;
        let errorDetail = "";
        if (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (errorMsg && errorMsg !== message && !message.includes(errorMsg)) {
                errorDetail = `: ${errorMsg}`;
            }
        }
        const fullMessage = `${message}${errorDetail}`;
        if (this.tryLogToLiveTask(module, fullMessage, "error"))
            return;
        const parentGroup = this.getParentGroup(module);
        if (parentGroup) {
            this.groupItem(parentGroup, fullMessage, "error");
            return;
        }
        console.error(`${this.getTimestamp()} ${this.formatModule(module)} ${colors_1.colors.red}${colors_1.icons.error}${colors_1.colors.reset}  ${colors_1.colors.red}${fullMessage}${colors_1.colors.reset}`);
        if (error instanceof Error && error.stack && this.level === "debug") {
            console.error(`${colors_1.colors.dim}${error.stack}${colors_1.colors.reset}`);
        }
    }
    debug(module, message, ...args) {
        if (!this.shouldLog("debug"))
            return;
        console.log(`${this.getTimestamp()} ${this.formatModule(module)} ${colors_1.colors.gray}${colors_1.icons.debug}${colors_1.colors.reset}  ${colors_1.colors.dim}${message}${colors_1.colors.reset}`, ...args);
    }
    step(module, current, total, message) {
        if (!this.shouldLog("info"))
            return;
        const percent = Math.round((current / total) * 100);
        const bar = this.progressBar(percent, 20);
        console.log(`${this.getTimestamp()} ${this.formatModule(module)} ${bar} ${colors_1.colors.dim}${current}/${total}${colors_1.colors.reset} ${message}`);
    }
    task(module, taskName) {
        if (!this.shouldLog("info"))
            return;
        const key = `${module}:${taskName}`;
        this.taskTimers.set(key, Date.now());
        this.activeTasks.add(key);
        console.log(`${this.getTimestamp()} ${this.formatModule(module)} ${colors_1.colors.cyan}${colors_1.icons.arrow}${colors_1.colors.reset}  ${colors_1.colors.bold}${taskName}${colors_1.colors.reset}`);
    }
    taskUpdate(module, taskName, message, status = "info") {
        if (!this.shouldLog("info"))
            return;
        const key = `${module}:${taskName}`;
        if (!this.activeTasks.has(key)) {
            this.task(module, taskName);
        }
        let icon;
        let color;
        switch (status) {
            case "success":
                icon = colors_1.icons.success;
                color = colors_1.colors.green;
                break;
            case "warn":
                icon = colors_1.icons.warning;
                color = colors_1.colors.yellow;
                break;
            case "error":
                icon = colors_1.icons.error;
                color = colors_1.colors.red;
                break;
            default:
                icon = colors_1.icons.bullet;
                color = colors_1.colors.dim;
        }
        console.log(`${this.getTimestamp()} ${" ".repeat(module.length + 2)}   ${color}${icon}${colors_1.colors.reset}  ${colors_1.colors.dim}${message}${colors_1.colors.reset}`);
    }
    taskEnd(module, taskName, message, success = true) {
        if (!this.shouldLog("info"))
            return;
        const key = `${module}:${taskName}`;
        const startTime = this.taskTimers.get(key);
        const duration = startTime ? Date.now() - startTime : 0;
        const timeStr = duration > 0 ? ` ${colors_1.colors.gray}(${this.formatDuration(duration)})${colors_1.colors.reset}` : "";
        const icon = success ? colors_1.icons.success : colors_1.icons.error;
        const color = success ? colors_1.colors.green : colors_1.colors.red;
        const finalMessage = message || (success ? "Done" : "Failed");
        console.log(`${this.getTimestamp()} ${" ".repeat(module.length + 2)}   ${color}${icon}${colors_1.colors.reset}  ${finalMessage}${timeStr}`);
        this.taskTimers.delete(key);
        this.activeTasks.delete(key);
    }
    progressBar(percent, width = 20) {
        const filled = Math.round((percent / 100) * width);
        const empty = width - filled;
        return `${colors_1.colors.green}${"█".repeat(filled)}${colors_1.colors.gray}${"░".repeat(empty)}${colors_1.colors.reset}`;
    }
    group(module, title) {
        if (!this.shouldLog("info"))
            return;
        const handle = this.live(module, title);
        this.liveGroupHandles.set(module, handle);
        this.activeGroups.set(module, {
            module,
            title,
            startTime: Date.now(),
            items: []
        });
    }
    groupItem(module, message, status = "info") {
        if (!this.shouldLog("info"))
            return;
        const handle = this.liveGroupHandles.get(module);
        if (handle) {
            handle.step(message, status);
        }
        const group = this.activeGroups.get(module);
        if (group) {
            group.items.push({ message, status });
        }
    }
    groupEnd(module, message, success = true) {
        if (!this.shouldLog("info"))
            return;
        const handle = this.liveGroupHandles.get(module);
        if (handle) {
            if (success) {
                handle.succeed(message);
            }
            else {
                handle.fail(message);
            }
            this.liveGroupHandles.delete(module);
        }
        this.activeGroups.delete(module);
    }
    hasActiveGroup(module) {
        return this.activeGroups.has(module);
    }
    registerGroupAlias(childModule, parentModule) {
        this.moduleGroupAliases.set(childModule, parentModule);
    }
    unregisterGroupAlias(childModule) {
        this.moduleGroupAliases.delete(childModule);
    }
    getParentGroup(module) {
        const parentModule = this.moduleGroupAliases.get(module);
        if (parentModule && this.activeGroups.has(parentModule)) {
            return parentModule;
        }
        return null;
    }
    registerLiveAlias(childModule, parentModule) {
        var _a;
        this.ensureLiveConsoleLoaded();
        if ((_a = this.liveConsole) === null || _a === void 0 ? void 0 : _a.registerAlias) {
            this.liveConsole.registerAlias(childModule, parentModule);
        }
        this.registerGroupAlias(childModule, parentModule);
    }
    unregisterLiveAlias(childModule) {
        var _a;
        if ((_a = this.liveConsole) === null || _a === void 0 ? void 0 : _a.unregisterAlias) {
            this.liveConsole.unregisterAlias(childModule);
        }
        this.unregisterGroupAlias(childModule);
    }
    ensureLiveConsoleLoaded() {
        if (!this.liveConsoleLoaded) {
            try {
                this.liveConsole = require("./live-console").liveConsole;
            }
            catch (_a) {
                this.liveConsole = null;
            }
            this.liveConsoleLoaded = true;
        }
    }
    live(module, title) {
        var _a;
        this.ensureLiveConsoleLoaded();
        if ((_a = this.liveConsole) === null || _a === void 0 ? void 0 : _a.enabled) {
            const handle = this.liveConsole.startTask(module, title);
            return {
                step: (message, status) => {
                    handle.step(message, status || "info");
                },
                progress: (percent, message) => {
                    handle.update(message || title, { progress: percent });
                },
                succeed: (message) => handle.succeed(message || "Done"),
                fail: (message) => handle.fail(message),
                warn: (message) => handle.warn(message || "Warning"),
                setRequest: (method, url) => handle.setRequest(method, url),
            };
        }
        const startTime = Date.now();
        console.log(`${this.getTimestamp()} ${this.formatModule(module)} ${colors_1.colors.cyan}${colors_1.icons.arrow}${colors_1.colors.reset}  ${title}`);
        const indent = " ".repeat(module.length + 12);
        return {
            step: (message, status) => {
                let icon = colors_1.icons.bullet;
                let color = colors_1.colors.dim;
                if (status === "success") {
                    icon = colors_1.icons.success;
                    color = colors_1.colors.green;
                }
                else if (status === "warn") {
                    icon = colors_1.icons.warning;
                    color = colors_1.colors.yellow;
                }
                else if (status === "error") {
                    icon = colors_1.icons.error;
                    color = colors_1.colors.red;
                }
                console.log(`${indent}├─ ${color}${icon}${colors_1.colors.reset} ${colors_1.colors.dim}${message}${colors_1.colors.reset}`);
            },
            progress: (percent, message) => {
                if (message) {
                    console.log(`${indent}├─ ${colors_1.colors.dim}${colors_1.icons.bullet}${colors_1.colors.reset} ${colors_1.colors.dim}${message} (${percent}%)${colors_1.colors.reset}`);
                }
            },
            succeed: (message) => {
                const duration = this.formatDuration(Date.now() - startTime);
                console.log(`${indent}└─ ${colors_1.colors.green}${colors_1.icons.success}${colors_1.colors.reset} ${colors_1.colors.green}${message || "Done"}${colors_1.colors.reset} ${colors_1.colors.gray}(${duration})${colors_1.colors.reset}`);
            },
            fail: (message) => {
                const duration = this.formatDuration(Date.now() - startTime);
                console.log(`${indent}└─ ${colors_1.colors.red}${colors_1.icons.error}${colors_1.colors.reset} ${colors_1.colors.red}${message || "Failed"}${colors_1.colors.reset} ${colors_1.colors.gray}(${duration})${colors_1.colors.reset}`);
            },
            warn: (message) => {
                const duration = this.formatDuration(Date.now() - startTime);
                console.log(`${indent}└─ ${colors_1.colors.yellow}${colors_1.icons.warning}${colors_1.colors.reset} ${colors_1.colors.yellow}${message || "Warning"}${colors_1.colors.reset} ${colors_1.colors.gray}(${duration})${colors_1.colors.reset}`);
            },
            setRequest: () => { },
        };
    }
    banner(name, version, env) {
        const width = 50;
        const line = colors_1.box.horizontal.repeat(width - 2);
        console.log("");
        console.log(`${colors_1.colors.cyan}${colors_1.box.topLeft}${line}${colors_1.box.topRight}${colors_1.colors.reset}`);
        console.log(`${colors_1.colors.cyan}${colors_1.box.vertical}${colors_1.colors.reset}${this.center(` ${colors_1.icons.rocket} ${colors_1.colors.bold}${colors_1.colors.brightCyan}${name}${colors_1.colors.reset} `, width - 2)}${colors_1.colors.cyan}${colors_1.box.vertical}${colors_1.colors.reset}`);
        console.log(`${colors_1.colors.cyan}${colors_1.box.vertical}${colors_1.colors.reset}${this.center(`${colors_1.colors.gray}v${version} • ${env}${colors_1.colors.reset}`, width - 2)}${colors_1.colors.cyan}${colors_1.box.vertical}${colors_1.colors.reset}`);
        console.log(`${colors_1.colors.cyan}${colors_1.box.bottomLeft}${line}${colors_1.box.bottomRight}${colors_1.colors.reset}`);
        console.log("");
    }
    section(title) {
        this.sectionTimers.set(title, Date.now());
        console.log(`${colors_1.colors.cyan}${colors_1.icons.arrow}${colors_1.colors.reset} ${colors_1.colors.bold}${title}${colors_1.colors.reset}`);
    }
    sectionEnd(title, details) {
        const startTime = this.sectionTimers.get(title);
        const duration = startTime ? Date.now() - startTime : 0;
        const timeStr = this.formatDuration(duration);
        if (details) {
            console.log(`  ${colors_1.colors.green}${colors_1.icons.success}${colors_1.colors.reset} ${colors_1.colors.dim}${details}${colors_1.colors.reset} ${colors_1.colors.gray}(${timeStr})${colors_1.colors.reset}`);
        }
        else {
            console.log(`  ${colors_1.colors.green}${colors_1.icons.success}${colors_1.colors.reset} ${colors_1.colors.dim}Done${colors_1.colors.reset} ${colors_1.colors.gray}(${timeStr})${colors_1.colors.reset}`);
        }
    }
    timings(items) {
        const parts = items.map((item) => {
            const timeStr = this.formatDuration(item.ms);
            return `${colors_1.colors.dim}${item.name}${colors_1.colors.reset} ${colors_1.colors.gray}${timeStr}${colors_1.colors.reset}`;
        });
        console.log(`  ${colors_1.colors.gray}${colors_1.box.teeRight}${colors_1.box.horizontal}${colors_1.colors.reset} ${parts.join(` ${colors_1.colors.gray}│${colors_1.colors.reset} `)}`);
    }
    ready(port, startTime) {
        const duration = startTime ? Date.now() - startTime : 0;
        const timeStr = duration > 0 ? ` ${colors_1.colors.gray}(${this.formatDuration(duration)})${colors_1.colors.reset}` : "";
        console.log("");
        console.log(`${colors_1.colors.green}${colors_1.icons.success}${colors_1.colors.reset} ${colors_1.colors.bold}${colors_1.colors.green}Server ready${colors_1.colors.reset} ${colors_1.colors.dim}on port${colors_1.colors.reset} ${colors_1.colors.cyan}${port}${colors_1.colors.reset}${timeStr}`);
        console.log("");
    }
    initialized(thread, totalMs, stats) {
        const statsStr = [
            stats.extensions > 0 ? `${stats.extensions} extensions` : null,
            stats.crons > 0 ? `${stats.crons} crons` : null,
            stats.routes ? `${stats.routes} routes` : null,
        ]
            .filter(Boolean)
            .join(" │ ");
        console.log(`  ${colors_1.colors.gray}${colors_1.box.bottomLeft}${colors_1.box.horizontal}${colors_1.colors.reset} ${colors_1.colors.dim}${statsStr}${colors_1.colors.reset}`);
        console.log("");
    }
    newline() {
        console.log("");
    }
    kv(module, key, value) {
        if (!this.shouldLog("info"))
            return;
        console.log(`${this.getTimestamp()} ${this.formatModule(module)} ${colors_1.colors.dim}${key}:${colors_1.colors.reset} ${value}`);
    }
    kvMultiple(module, data) {
        if (!this.shouldLog("info"))
            return;
        console.log(`${this.getTimestamp()} ${this.formatModule(module)}`);
        for (const [key, value] of Object.entries(data)) {
            console.log(`  ${colors_1.colors.gray}${colors_1.icons.bullet}${colors_1.colors.reset} ${colors_1.colors.dim}${key}:${colors_1.colors.reset} ${value}`);
        }
    }
    table(module, data, columns) {
        if (!this.shouldLog("info"))
            return;
        console.log(`${this.getTimestamp()} ${this.formatModule(module)}`);
        console.table(data, columns);
    }
    center(text, width) {
        const actualLength = text.replace(/\x1b\[[0-9;]*m/g, "").length;
        const padding = Math.max(0, width - actualLength);
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return " ".repeat(leftPad) + text + " ".repeat(rightPad);
    }
    formatDuration(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        else if (ms < 60000) {
            return `${(ms / 1000).toFixed(1)}s`;
        }
        else {
            const mins = Math.floor(ms / 60000);
            const secs = ((ms % 60000) / 1000).toFixed(0);
            return `${mins}m ${secs}s`;
        }
    }
}
exports.logger = new Logger();
exports.console$ = exports.logger;
exports.default = exports.logger;
const logInfo = (module, message, ...args) => exports.logger.info(module, message, ...args);
exports.logInfo = logInfo;
const logSuccess = (module, message, ...args) => exports.logger.success(module, message, ...args);
exports.logSuccess = logSuccess;
const logWarn = (module, message, ...args) => exports.logger.warn(module, message, ...args);
exports.logWarn = logWarn;
const logError = (module, message, error) => exports.logger.error(module, message, error);
exports.logError = logError;
const logDebug = (module, message, ...args) => exports.logger.debug(module, message, ...args);
exports.logDebug = logDebug;
