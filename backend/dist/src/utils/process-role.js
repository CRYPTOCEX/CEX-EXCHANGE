"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BACKEND_ROOT = exports.ROLE_PREFIX_WIDTH = exports.roleLogPrefix = exports.supportsAnsi = exports.DEFAULT_TRADING_PORT = exports.ROLE_REFUSED_EXIT_CODE = void 0;
exports.processRoleRefusal = processRoleRefusal;
exports.declaredProcessRole = declaredProcessRole;
exports.processRole = processRole;
exports.isSchemaSyncOnly = isSchemaSyncOnly;
exports.rolePort = rolePort;
exports.roleColor = roleColor;
exports.roleLabel = roleLabel;
exports.roleBadge = roleBadge;
exports.roleSummary = roleSummary;
exports.applyTerminalTitle = applyTerminalTitle;
const path_1 = __importDefault(require("path"));
exports.ROLE_REFUSED_EXIT_CODE = 78;
let resolved = null;
function roleFromCronMode(raw) {
    return raw === "off" ? "web" : raw === "only" ? "cron" : "inline";
}
function processRoleRefusal(env = process.env) {
    const declared = (env.ECO_PROCESS_ROLE || "").trim().toLowerCase();
    if (declared === "")
        return null;
    const cronRaw = (env.CRON_MODE || "").trim().toLowerCase();
    const cronShown = env.CRON_MODE === undefined ? "unset" : `"${env.CRON_MODE}"`;
    if (declared !== "trading" && declared !== "web") {
        return (`ECO_PROCESS_ROLE="${env.ECO_PROCESS_ROLE}" is not a role this backend knows ` +
            `(valid: "trading", "web", or unset); refusing to boot rather than guess which process hosts the matcher.`);
    }
    if (cronRaw !== "off") {
        return (`ECO_PROCESS_ROLE=${declared} requires CRON_MODE=off (this process has CRON_MODE ${cronShown}); ` +
            (declared === "trading"
                ? `a trading process must not also run the scheduler, so production.config.js sets both and .env sets neither.`
                : `the value belongs in the pm2 config's web app only, so it has leaked in from .env or the shell; unset it there.`));
    }
    return null;
}
function declaredProcessRole() {
    const declared = (process.env.ECO_PROCESS_ROLE || "").trim().toLowerCase();
    return declared === "trading" || declared === "web" ? declared : null;
}
function refuseBoot(reason) {
    process.stderr.write(`\nBackend refused to start: ${reason}\n`);
    process.exit(exports.ROLE_REFUSED_EXIT_CODE);
    throw new Error(`process role refused: ${reason}`);
}
function resolve() {
    if (resolved)
        return resolved;
    const raw = (process.env.CRON_MODE || "").trim().toLowerCase();
    const refusal = processRoleRefusal();
    if (refusal)
        refuseBoot(refusal);
    resolved = declaredProcessRole() === "trading" ? "trading" : roleFromCronMode(raw);
    return resolved;
}
function processRole() {
    return resolve();
}
function isSchemaSyncOnly() {
    const raw = (process.env.BICRYPTO_SCHEMA_SYNC_ONLY || "").trim().toLowerCase();
    return raw === "1" || raw === "true";
}
exports.DEFAULT_TRADING_PORT = 4010;
function rolePort() {
    if (resolve() === "trading") {
        return Number(process.env.ECO_TRADING_PORT || exports.DEFAULT_TRADING_PORT);
    }
    return Number(process.env.NEXT_PUBLIC_BACKEND_PORT || 4000);
}
exports.supportsAnsi = process.env.NO_COLOR
    ? false
    : process.env.FORCE_COLOR
        ? true
        : process.stdout.isTTY === true;
const ROLE_COLOR = {
    web: "\x1b[32m",
    cron: "\x1b[33m",
    inline: "\x1b[36m",
    trading: "\x1b[35m",
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const REVERSE = "\x1b[7m";
function roleColor() {
    return exports.supportsAnsi ? ROLE_COLOR[resolve()] : "";
}
function roleLabel() {
    const role = resolve();
    if (role === "web")
        return "WEB / API";
    if (role === "cron")
        return "CRON / SCHEDULER";
    if (role === "trading")
        return "TRADING / ENGINES";
    return "INLINE / ALL-IN-ONE";
}
const ROLE_TAG = {
    web: "WEB ",
    cron: "CRON",
    inline: "",
    trading: "TRAD",
};
exports.roleLogPrefix = (() => {
    const role = resolve();
    const tag = ROLE_TAG[role];
    if (!tag)
        return "";
    return exports.supportsAnsi ? `${BOLD}${ROLE_COLOR[role]}${tag}${RESET} ` : `${tag} `;
})();
exports.ROLE_PREFIX_WIDTH = exports.roleLogPrefix ? ROLE_TAG[resolve()].length + 1 : 0;
function roleBadge() {
    const label = ` ${roleLabel()} `;
    return exports.supportsAnsi ? `${BOLD}${REVERSE}${ROLE_COLOR[resolve()]}${label}${RESET}` : label;
}
function roleSummary() {
    const role = resolve();
    const mode = process.env.CRON_MODE || "inline";
    if (role === "cron")
        return `port ${rolePort()} · CRON_MODE=${mode} · runs jobs, no traffic`;
    if (role === "trading")
        return `port ${rolePort()} · CRON_MODE=${mode} · trading routes and engines, no jobs`;
    if (role === "web") {
        const engines = declaredProcessRole() === "web" ? ", no engines" : "";
        return `port ${rolePort()} · CRON_MODE=${mode} · serves traffic, no jobs${engines}`;
    }
    return `port ${rolePort()} · CRON_MODE=${mode} · traffic and jobs`;
}
function applyTerminalTitle(appName) {
    if (process.stdout.isTTY !== true)
        return;
    const role = resolve();
    const short = role === "cron" ? "CRON" : role === "web" ? "WEB" : role === "trading" ? "TRAD" : "DEV";
    const name = appName || process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";
    process.stdout.write(`\x1b]0;${short} :${rolePort()} · ${name}\x07`);
}
exports.BACKEND_ROOT = path_1.default.resolve(__dirname, "..", "..");
