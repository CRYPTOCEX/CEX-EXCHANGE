"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__internals = void 0;
exports.startHotReload = startHotReload;
exports.stopHotReload = stopHotReload;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chokidar_1 = require("chokidar");
const Routes_1 = require("@b/handler/Routes");
const server_init_1 = require("@b/handler/utils/server-init");
const console_1 = require("@b/utils/console");
const mode_1 = require("@b/cron/mode");
const process_role_1 = require("@b/utils/process-role");
const restart_scope_1 = require("./restart-scope");
const IS_WINDOWS = process.platform === "win32";
function key(p) {
    const normalized = path_1.default.normalize(path_1.default.resolve(p));
    return IS_WINDOWS ? normalized.toLowerCase() : normalized;
}
const BACKEND_ROOT = path_1.default.resolve(__dirname, "..", "..", "..");
const API_ROOT = key((0, server_init_1.getApiRoutesPath)());
const SRC_DIR = path_1.default.dirname((0, server_init_1.getApiRoutesPath)());
const SRC_ROOT = key(SRC_DIR);
const SENTINEL = (0, restart_scope_1.devRestartSentinel)();
const LOADER_MODULES = new Set(["@b/handler/Routes", "@b/handler/Websocket"].map((id) => {
    try {
        return key(require.resolve(id));
    }
    catch (_a) {
        const file = id.split("/").pop();
        return key(path_1.default.join(BACKEND_ROOT, "src", "handler", `${file}.ts`));
    }
}));
const UNSAFE_PATHS = [
    [/\.ws\.ts$/i, "WebSocket handlers are bound to live sockets"],
    [/[\\/]cron\.ts$/i, "cron jobs are registered once at boot"],
    [/[\\/]utils[\\/]engine[\\/]/i, "engine singletons own timers and in-memory books"],
    [/[\\/]scylla[\\/]/i, "the Scylla client owns the connection pool"],
    [/[\\/]src[\\/]index\.ts$/i, "it is the server bootstrap"],
    [
        /[\\/]src[\\/](?:handler|services|cron|config)[\\/]/i,
        "it is wired into the process at boot",
    ],
    [/[\\/]src[\\/]utils[\\/]dev[\\/]/i, "it is the hot-reloader itself"],
];
const EXTRA_UNSAFE = (process.env.HOT_RELOAD_UNSAFE || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
const INERT_CONSTRUCTORS = "Map|Set|WeakMap|WeakSet|Date|RegExp|Error|TypeError|RangeError|Array|Object|Promise|URL|URLSearchParams|TextEncoder|TextDecoder|Intl|Decimal|BigNumber|Big|Ajv|Buffer|AbortController|Headers|Response|Request";
const NOT_A_CALL = "require|import|export|module|exports|console|describe|it|test|expect|if|for|while|switch|do|else|try|catch|finally|return|throw|new|void|await|yield|function|class|type|interface|enum|declare";
const MODULE_SCOPE_SIDE_EFFECTS = [
    [/^(?:setInterval|setTimeout|setImmediate)\s*\(/m, "starts a timer at module scope"],
    [/^process\.(?:on|once)\s*\(/m, "adds a process listener at module scope"],
    [/^new\s+\w+\s*\(/m, "constructs something at module scope"],
    [
        /^(?:void\s+)?;?\(\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)/m,
        "runs an IIFE at module scope",
    ],
    [
        new RegExp(`^(?:export\\s+)?(?:const|let|var)\\s+\\w+\\s*(?::[^=\\n]+)?=\\s*new\\s+(?!(?:${INERT_CONSTRUCTORS})\\b)[A-Z$_]`, "m"),
        "holds a singleton built at module scope",
    ],
    [
        new RegExp(`^(?!(?:${NOT_A_CALL})\\b)[a-zA-Z_$][\\w$.]*\\s*\\(`, "m"),
        "registers something at module scope",
    ],
];
function isUnsafe(file) {
    const name = path_1.default.basename(file);
    for (const [pattern, reason] of UNSAFE_PATHS) {
        if (pattern.test(file))
            return `${name}: ${reason}`;
    }
    const lower = file.toLowerCase();
    for (const needle of EXTRA_UNSAFE) {
        if (lower.includes(needle))
            return `${name} matches HOT_RELOAD_UNSAFE="${needle}"`;
    }
    try {
        const source = fs_1.default.readFileSync(file, "utf8");
        for (const [pattern, reason] of MODULE_SCOPE_SIDE_EFFECTS) {
            if (pattern.test(source))
                return `${name} ${reason}`;
        }
    }
    catch (_a) {
    }
    return null;
}
function isUnderSrcRoot(file) {
    const k = key(file);
    return k === SRC_ROOT || k.startsWith(SRC_ROOT + path_1.default.sep);
}
function isUnderApiRoot(file) {
    const k = key(file);
    return k === API_ROOT || k.startsWith(API_ROOT + path_1.default.sep);
}
function collectDependents(seeds) {
    const parents = new Map();
    for (const id of Object.keys(require.cache)) {
        const mod = require.cache[id];
        if (!mod)
            continue;
        for (const child of mod.children) {
            const list = parents.get(child.id);
            if (list)
                list.push(id);
            else
                parents.set(child.id, [id]);
        }
    }
    const byKey = new Map();
    for (const id of Object.keys(require.cache))
        byKey.set(key(id), id);
    const modules = [];
    const escaped = [];
    const seen = new Set();
    const queue = [];
    for (const seed of seeds) {
        const id = byKey.get(key(seed));
        if (id && !seen.has(id)) {
            seen.add(id);
            queue.push(id);
            modules.push(id);
        }
    }
    while (queue.length) {
        const current = queue.shift();
        for (const parent of parents.get(current) || []) {
            if (seen.has(parent))
                continue;
            const parentKey = key(parent);
            if (LOADER_MODULES.has(parentKey))
                continue;
            if (!isUnderSrcRoot(parent)) {
                escaped.push(parent);
                continue;
            }
            seen.add(parent);
            modules.push(parent);
            queue.push(parent);
        }
    }
    return { modules, escaped };
}
function purge(modules) {
    const modKeys = new Set(modules.map(key));
    for (const id of modules)
        delete require.cache[id];
    for (const id of Object.keys(require.cache)) {
        const mod = require.cache[id];
        if (!mod)
            continue;
        if (mod.children.some((child) => modKeys.has(key(child.id)))) {
            mod.children = mod.children.filter((child) => !modKeys.has(key(child.id)));
        }
    }
    for (const cached of Array.from(Routes_1.routeCache.keys())) {
        if (modKeys.has(key(cached)))
            Routes_1.routeCache.delete(cached);
    }
}
let restartRequested = false;
function requestFullRestart(reason) {
    if (restartRequested)
        return;
    restartRequested = true;
    console_1.logger.warn("HOT", `Full restart needed — ${reason}`);
    if (!(0, restart_scope_1.touchRestartSentinel)(reason)) {
        console_1.logger.error("HOT", `Could not touch ${path_1.default.basename(SENTINEL)} to trigger the restart. Restart this process manually.`);
        restartRequested = false;
    }
}
function relative(file) {
    return path_1.default.relative(BACKEND_ROOT, file).replace(/\\/g, "/");
}
function applyChanges(files) {
    for (const file of files) {
        const reason = isUnsafe(file);
        if (reason) {
            requestFullRestart(reason);
            return;
        }
    }
    const { modules, escaped } = collectDependents(files);
    if (escaped.length) {
        requestFullRestart(`${relative(files[0])} is also loaded by ${relative(escaped[0])}` +
            (escaped.length > 1 ? ` (+${escaped.length - 1} more)` : ""));
        return;
    }
    for (const mod of modules) {
        const reason = isUnsafe(mod);
        if (reason) {
            requestFullRestart(reason);
            return;
        }
    }
    if (!modules.length) {
        console_1.logger.info("HOT", `${files.map(relative).join(", ")} — not loaded yet, next request picks it up`);
        return;
    }
    purge(modules);
    const shown = modules.slice(0, 4).map(relative).join(", ");
    const extra = modules.length > 4 ? ` (+${modules.length - 4} more)` : "";
    console_1.logger.info("HOT", `Reloaded ${modules.length} module(s): ${shown}${extra}`);
}
const pending = new Map();
let flushTimer = null;
function merge(previous, kind) {
    if (!previous)
        return kind;
    if (previous === "unlink" && kind === "add")
        return "change";
    if (previous === "add" && kind === "unlink")
        return "unlink";
    if (previous === "add" || previous === "unlink")
        return previous;
    return kind === "add" ? "change" : kind;
}
function record(kind, file) {
    if (!file.endsWith(".ts"))
        return;
    pending.set(file, merge(pending.get(file), kind));
    if (flushTimer)
        clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 120);
}
function isLoaded(file) {
    const k = key(file);
    for (const id of Object.keys(require.cache)) {
        if (key(id) === k)
            return true;
    }
    return false;
}
function needsRestartForStructure(file, kind) {
    if (isUnderApiRoot(file))
        return true;
    return kind === "unlink" && isLoaded(file);
}
function affectsThisProcess(file) {
    const role = (0, process_role_1.processRole)();
    const { scope, why } = (0, restart_scope_1.classifyRestartScope)(file);
    if ((0, restart_scope_1.scopeCoversRole)(scope, role))
        return true;
    if ((0, restart_scope_1.isLazyCronModule)(file) && isLoaded(file)) {
        console_1.logger.warn("HOT", `${relative(file)} is classified ${scope}-only, but THIS (${role}) process has it loaded — ` +
            `restarting anyway. dev/restart-scope.ts needs a crossover entry for it; ` +
            `run "pnpm --filter backend test:restart-scope" to see the importer.`);
        return true;
    }
    console_1.logger.debug("HOT", `Ignoring ${relative(file)} — ${scope}-only (${why}), this process is ${role}`);
    return false;
}
function flush() {
    flushTimer = null;
    const all = Array.from(pending.entries());
    pending.clear();
    if (!all.length || restartRequested)
        return;
    const batch = all.filter(([file]) => affectsThisProcess(file));
    if (!batch.length) {
        const shown = all.map(([file]) => relative(file)).slice(0, 3).join(", ");
        const extra = all.length > 3 ? ` (+${all.length - 3} more)` : "";
        console_1.logger.info("HOT", `No change for the ${(0, process_role_1.processRole)()} process: ${shown}${extra}`);
        return;
    }
    const structural = batch.find(([file, kind]) => kind !== "change" && needsRestartForStructure(file, kind));
    if (structural) {
        const [file, kind] = structural;
        requestFullRestart(`${relative(file)} was ${kind === "add" ? "added" : "deleted"} — ` +
            (isUnderApiRoot(file) ? "route table must be rebuilt" : "it is loaded in this process"));
        return;
    }
    try {
        applyChanges(batch.map(([file]) => file));
    }
    catch (error) {
        requestFullRestart(`hot-reload failed: ${error.message}`);
    }
}
let watcher = null;
function startHotReload() {
    if (watcher)
        return;
    if (process.env.NODE_ENV === "production")
        return;
    if (process.env.HOT_RELOAD === "false") {
        if (process.env.DEV_FULL_WATCH === "true") {
            console_1.logger.info("HOT", "Hot reload disabled — nodemon is watching everything (dev:full)");
        }
        else {
            console_1.logger.warn("HOT", 'Hot reload disabled (HOT_RELOAD=false) and nodemon does not watch src — no change under src will be picked up. Use "npm run dev:full" instead.');
        }
        return;
    }
    if (!fs_1.default.existsSync(SENTINEL)) {
        try {
            fs_1.default.writeFileSync(SENTINEL, `${JSON.stringify({ requestedAt: null, reason: null }, null, 2)}\n`);
            console_1.logger.warn("HOT", `Created ${path_1.default.basename(SENTINEL)}. Restart this process once so nodemon starts watching it, otherwise unsafe changes will not trigger a full restart.`);
        }
        catch (_a) {
        }
    }
    if ((0, mode_1.cronMode)() !== ((0, process_role_1.processRole)() === "web" ? "off" : (0, process_role_1.processRole)() === "cron" ? "only" : "inline")) {
        console_1.logger.error("HOT", `Role mismatch: cron/mode.ts says "${(0, mode_1.cronMode)()}" but utils/process-role.ts says ` +
            `"${(0, process_role_1.processRole)()}". Restart scoping is unreliable until they agree — the two resolvers ` +
            `have drifted apart.`);
    }
    try {
        watcher = (0, chokidar_1.watch)(SRC_DIR, {
            ignoreInitial: true,
            ignored: (target, stats) => (stats === null || stats === void 0 ? void 0 : stats.isFile()) === true && !target.endsWith(".ts"),
            awaitWriteFinish: { stabilityThreshold: 60, pollInterval: 20 },
        });
        watcher.on("change", (file) => record("change", file));
        watcher.on("add", (file) => record("add", file));
        watcher.on("unlink", (file) => record("unlink", file));
        watcher.on("error", (error) => {
            console_1.logger.error("HOT", `Watcher error: ${error === null || error === void 0 ? void 0 : error.message}`);
        });
        const role = (0, process_role_1.processRole)();
        console_1.logger.info("HOT", `Hot reload active for src — swappable edits apply in place, the rest touch ` +
            `${path_1.default.basename(SENTINEL)}` +
            (role === "inline"
                ? ""
                : `. Changes that only affect the ${role === "web" ? "cron" : "web"} process are ignored here.`));
    }
    catch (error) {
        watcher = null;
        console_1.logger.error("HOT", `Could not start hot reload: ${error.message}. Edits under src will NOT be picked up at all — nodemon no longer watches it. Restart manually or use "npm run dev:full".`);
    }
}
function stopHotReload() {
    if (!watcher)
        return;
    void watcher.close();
    watcher = null;
}
exports.__internals = {
    key,
    isUnsafe,
    collectDependents,
    applyChanges,
    purge,
    needsRestartForStructure,
    API_ROOT,
    SRC_ROOT,
    LOADER_MODULES,
    SENTINEL,
    resetRestartFlag: () => {
        restartRequested = false;
    },
    wasRestartRequested: () => restartRequested,
};
