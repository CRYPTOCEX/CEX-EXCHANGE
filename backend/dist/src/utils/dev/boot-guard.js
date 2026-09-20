"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installDevBootGuard = installDevBootGuard;
exports.disarmDevBootGuard = disarmDevBootGuard;
exports.waitForFix = waitForFix;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const restart_scope_1 = require("./restart-scope");
const BACKEND_ROOT = path_1.default.resolve(__dirname, "..", "..", "..");
const WATCH_TARGETS = [
    path_1.default.join(BACKEND_ROOT, "src"),
    path_1.default.join(BACKEND_ROOT, "models"),
    path_1.default.join(BACKEND_ROOT, "index.ts"),
];
let armed = false;
let waiting = false;
let watcher = null;
function isDev() {
    return process.env.NODE_ENV !== "production";
}
function installDevBootGuard() {
    if (!isDev() || armed)
        return;
    armed = true;
    process.on("uncaughtException", onBootFailure);
    process.on("unhandledRejection", onBootFailure);
}
function disarmDevBootGuard() {
    if (!armed)
        return;
    armed = false;
    process.removeListener("uncaughtException", onBootFailure);
    process.removeListener("unhandledRejection", onBootFailure);
}
function onBootFailure(error) {
    disarmDevBootGuard();
    waitForFix(error);
}
function waitForFix(error) {
    if (!isDev()) {
        process.exit(1);
    }
    if (waiting)
        return;
    waiting = true;
    disarmDevBootGuard();
    const detail = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`\n\x1b[31m ${roleBadgeText()} failed to start \x1b[0m\n${detail}\n\n` +
        `\x1b[33mThis process is NOT running.\x1b[0m Watching for a fix — save any file under ` +
        `src/ or models/ and it will restart.\n\n`);
    try {
        const { watch } = require("chokidar");
        watcher = watch(WATCH_TARGETS.filter((target) => fs_1.default.existsSync(target)), {
            ignoreInitial: true,
            ignored: (target, stats) => (stats === null || stats === void 0 ? void 0 : stats.isFile()) === true && !target.endsWith(".ts"),
            awaitWriteFinish: { stabilityThreshold: 60, pollInterval: 20 },
        });
        const onChange = (file) => {
            if (!file.endsWith(".ts"))
                return;
            requestRestart(path_1.default.relative(BACKEND_ROOT, file).replace(/\\/g, "/"));
        };
        watcher.on("change", onChange);
        watcher.on("add", onChange);
        watcher.on("unlink", onChange);
    }
    catch (watchError) {
        process.stderr.write(`Could not watch for a fix (${watchError === null || watchError === void 0 ? void 0 : watchError.message}). Restart the backend manually.\n`);
        process.exit(1);
    }
}
let restartSent = false;
function requestRestart(changedFile) {
    if (restartSent)
        return;
    restartSent = true;
    process.stderr.write(`\n[${roleBadgeText()}] ${changedFile} changed — restarting...\n`);
    if (!(0, restart_scope_1.touchRestartSentinel)(`boot failed, ${changedFile} changed`)) {
        process.exit(1);
    }
}
function roleBadgeText() {
    const sentinel = path_1.default.basename((0, restart_scope_1.devRestartSentinel)());
    if (sentinel.includes(".web."))
        return "Backend WEB";
    if (sentinel.includes(".cron."))
        return "Backend CRON";
    return "Backend";
}
