"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IconSyncError = exports.ICON_DIR = exports.ICON_SCRIPT = void 0;
exports.buildArgs = buildArgs;
exports.runIconSync = runIconSync;
exports.invalidateIconReport = invalidateIconReport;
exports.getIconReport = getIconReport;
exports.summarize = summarize;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
function repoRoot() {
    let dir = __dirname;
    for (let i = 0; i < 12; i++) {
        if (fs_1.default.existsSync(path_1.default.join(dir, "backend", "package.json")) &&
            fs_1.default.existsSync(path_1.default.join(dir, "frontend"))) {
            return dir;
        }
        const up = path_1.default.dirname(dir);
        if (up === dir)
            break;
        dir = up;
    }
    return null;
}
function backendRoot() {
    let dir = __dirname;
    for (let i = 0; i < 12; i++) {
        if (fs_1.default.existsSync(path_1.default.join(dir, "scripts", "sync-crypto-icons.mjs")))
            return dir;
        const up = path_1.default.dirname(dir);
        if (up === dir)
            break;
        dir = up;
    }
    return path_1.default.resolve(process.cwd());
}
const ICON_SCRIPT = () => path_1.default.join(backendRoot(), "scripts", "sync-crypto-icons.mjs");
exports.ICON_SCRIPT = ICON_SCRIPT;
const ICON_DIR = () => {
    const root = repoRoot();
    return root ? path_1.default.join(root, "frontend", "public", "img", "crypto") : "";
};
exports.ICON_DIR = ICON_DIR;
const SAFE_BUCKETS = new Set(["cex", "eco", "fiat", "fx"]);
const SAFE_SOURCES = new Set([
    "local-blockchains",
    "alias",
    "trustwallet",
    "tokenlist",
    "coingecko",
    "flag",
    "alias-word",
]);
function buildArgs(opts, jsonPath) {
    const args = [`--json=${jsonPath}`];
    if (opts.apply)
        args.push("--apply");
    if (opts.enabledOnly)
        args.push("--enabled-only");
    if (opts.noNetwork)
        args.push("--no-network");
    if (opts.overwrite)
        args.push("--overwrite");
    const narrow = (requested, allowed, flag) => {
        if (!requested || requested.length === 0)
            return;
        const kept = requested.filter((v) => allowed.has(v));
        args.push(`--${flag}=${kept.length ? kept.join(",") : "__none__"}`);
    };
    narrow(opts.buckets, SAFE_BUCKETS, "only");
    narrow(opts.sources, SAFE_SOURCES, "sources");
    const symbols = (opts.symbols || [])
        .map((s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, ""))
        .filter(Boolean)
        .slice(0, 200);
    if (symbols.length)
        args.push(`--symbols=${symbols.join(",")}`);
    if (Number.isFinite(opts.limit) && opts.limit >= 0) {
        args.push(`--limit=${Math.floor(opts.limit)}`);
    }
    return args;
}
class IconSyncError extends Error {
    constructor(message, detail) {
        super(message);
        this.detail = detail;
    }
}
exports.IconSyncError = IconSyncError;
async function runIconSync(opts = {}) {
    var _a;
    const script = (0, exports.ICON_SCRIPT)();
    if (!fs_1.default.existsSync(script)) {
        throw new IconSyncError("Icon sync script not found. It ships at backend/scripts/sync-crypto-icons.mjs.", script);
    }
    const iconDir = (0, exports.ICON_DIR)();
    if (!iconDir || !fs_1.default.existsSync(iconDir)) {
        throw new IconSyncError("The icon directory frontend/public/img/crypto does not exist on this host, so " +
            "there is nowhere to write icons that the app would actually serve. This is " +
            "expected on a backend-only deployment — run the CLI on the host that serves the frontend.");
    }
    const outDir = path_1.default.join(backendRoot(), "storage", "icon-sync");
    fs_1.default.mkdirSync(outDir, { recursive: true });
    const jsonPath = path_1.default.join(outDir, `admin-report-${process.pid}-${Date.now()}.json`);
    const args = [script, ...buildArgs(opts, jsonPath)];
    const timeoutMs = Math.min(Math.max((_a = opts.timeoutMs) !== null && _a !== void 0 ? _a : 60000, 5000), 4 * 60 * 1000);
    const stdout = [];
    const stderr = [];
    const dropTemp = () => {
        try {
            if (fs_1.default.existsSync(jsonPath))
                fs_1.default.unlinkSync(jsonPath);
        }
        catch (_a) {
        }
    };
    const code = await new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(process.execPath, args, {
            cwd: backendRoot(),
            env: process.env,
            shell: false,
            windowsHide: true,
        });
        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            dropTemp();
            reject(new IconSyncError(`Icon sync timed out after ${Math.round(timeoutMs / 1000)}s. Lower "limit" or run the CLI for a full backfill.`));
        }, timeoutMs);
        child.stdout.on("data", (d) => stdout.push(String(d)));
        child.stderr.on("data", (d) => stderr.push(String(d)));
        child.on("error", (e) => {
            clearTimeout(timer);
            reject(new IconSyncError("Failed to start icon sync", e.message));
        });
        child.on("close", (c) => {
            clearTimeout(timer);
            resolve(c !== null && c !== void 0 ? c : 1);
        });
    });
    if (code !== 0) {
        dropTemp();
        console.error("[icon-sync] script exited", code, (stderr.join("") || stdout.join("")).slice(-4000));
        throw new IconSyncError(`Icon sync failed (exit ${code}). See the server log for details.`);
    }
    let report;
    try {
        report = JSON.parse(fs_1.default.readFileSync(jsonPath, "utf8"));
    }
    catch (e) {
        console.error("[icon-sync] unreadable report:", e === null || e === void 0 ? void 0 : e.message, stdout.join("").slice(-2000));
        throw new IconSyncError("Icon sync produced no readable report. See the server log for details.");
    }
    finally {
        dropTemp();
    }
    return report;
}
const REPORT_TTL_MS = 60000;
const memoryCache = new Map();
function cacheKey(opts) {
    return opts.enabledOnly ? "enabled-only" : "all";
}
function cacheFile(key) {
    return path_1.default.join(backendRoot(), "storage", "icon-sync", `cache-${key}.json`);
}
function readDiskCache(key) {
    try {
        const file = cacheFile(key);
        const stat = fs_1.default.statSync(file);
        const age = Date.now() - stat.mtimeMs;
        if (age > REPORT_TTL_MS)
            return null;
        return {
            at: stat.mtimeMs,
            diskAt: stat.mtimeMs,
            report: JSON.parse(fs_1.default.readFileSync(file, "utf8")),
        };
    }
    catch (_a) {
        return null;
    }
}
function writeDiskCache(key, report) {
    try {
        const file = cacheFile(key);
        fs_1.default.mkdirSync(path_1.default.dirname(file), { recursive: true });
        const tmp = `${file}.${process.pid}.tmp`;
        fs_1.default.writeFileSync(tmp, JSON.stringify(report));
        fs_1.default.renameSync(tmp, file);
        return fs_1.default.statSync(file).mtimeMs;
    }
    catch (_a) {
        return null;
    }
}
function stillValid(key, entry) {
    if (entry.diskAt === null)
        return true;
    try {
        return fs_1.default.statSync(cacheFile(key)).mtimeMs === entry.diskAt;
    }
    catch (_a) {
        return false;
    }
}
function invalidateIconReport() {
    memoryCache.clear();
    try {
        const dir = path_1.default.join(backendRoot(), "storage", "icon-sync");
        for (const name of fs_1.default.readdirSync(dir)) {
            if (name.startsWith("cache-") && name.endsWith(".json")) {
                fs_1.default.unlinkSync(path_1.default.join(dir, name));
            }
        }
    }
    catch (_a) {
    }
}
async function getIconReport(opts = {}, force = false) {
    var _a;
    const key = cacheKey(opts);
    if (!force) {
        const inMemory = memoryCache.get(key);
        if (inMemory && !stillValid(key, inMemory))
            memoryCache.delete(key);
        const hit = (_a = memoryCache.get(key)) !== null && _a !== void 0 ? _a : readDiskCache(key);
        if (hit && Date.now() - hit.at <= REPORT_TTL_MS) {
            memoryCache.set(key, hit);
            return { report: hit.report, cachedAt: hit.at, fromCache: true };
        }
    }
    const report = await runIconSync(opts);
    const at = Date.now();
    const diskAt = writeDiskCache(key, report);
    memoryCache.set(key, { at, report, diskAt });
    return { report, cachedAt: at, fromCache: false };
}
const OUTCOME_RANK = {
    written: 0,
    "would-write": 1,
    ambiguous: 2,
    unresolved: 3,
    "convert-failed": 4,
};
const rankOutcome = (o) => { var _a; return (_a = OUTCOME_RANK[o]) !== null && _a !== void 0 ? _a : 5; };
function summarize(report, query = {}) {
    var _a, _b, _c;
    const byOutcome = {};
    const byBucket = {};
    for (const i of report.items) {
        byOutcome[i.outcome] = (byOutcome[i.outcome] || 0) + 1;
        byBucket[i.bucket] = (byBucket[i.bucket] || 0) + 1;
    }
    const bucket = query.bucket && query.bucket !== "all" ? query.bucket : null;
    const outcome = query.outcome && query.outcome !== "all" ? query.outcome : null;
    const search = String((_a = query.search) !== null && _a !== void 0 ? _a : "").trim().toLowerCase();
    let items = report.items;
    if (bucket)
        items = items.filter((i) => i.bucket === bucket);
    if (outcome)
        items = items.filter((i) => i.outcome === outcome);
    if (search) {
        items = items.filter((i) => { var _a, _b, _c; return i.symbol.toLowerCase().includes(search) ||
            String((_a = i.raw) !== null && _a !== void 0 ? _a : "").toLowerCase().includes(search) ||
            String((_b = i.source) !== null && _b !== void 0 ? _b : "").toLowerCase().includes(search) ||
            String((_c = i.detail) !== null && _c !== void 0 ? _c : "").toLowerCase().includes(search); });
    }
    const dir = query.dir === "desc" ? -1 : 1;
    const sorted = [...items].sort((a, b) => {
        var _a, _b;
        switch (query.sort) {
            case "symbol":
                return dir * a.symbol.localeCompare(b.symbol);
            case "bucket":
                return dir * (a.bucket.localeCompare(b.bucket) || a.symbol.localeCompare(b.symbol));
            case "source":
                return (dir * (String((_a = a.source) !== null && _a !== void 0 ? _a : "").localeCompare(String((_b = b.source) !== null && _b !== void 0 ? _b : "")) ||
                    a.symbol.localeCompare(b.symbol)));
            default:
                return (dir * (rankOutcome(a.outcome) - rankOutcome(b.outcome)) ||
                    a.symbol.localeCompare(b.symbol));
        }
    });
    const perPage = Math.min(Math.max(Math.floor((_b = query.perPage) !== null && _b !== void 0 ? _b : 25), 1), 200);
    const filteredCount = sorted.length;
    const pageCount = Math.max(1, Math.ceil(filteredCount / perPage));
    const page = Math.min(Math.max(Math.floor((_c = query.page) !== null && _c !== void 0 ? _c : 1), 1), pageCount);
    const offset = (page - 1) * perPage;
    return {
        generatedAt: report.generatedAt,
        applied: report.applied,
        existingIcons: report.existingIcons,
        placeholderIcons: report.placeholderIcons.length,
        totalSymbols: report.totalSymbols,
        missing: report.missing,
        missingByBucket: report.missingByBucket,
        inScope: report.inScope,
        stats: report.stats,
        bySource: report.bySource,
        byOutcome,
        byBucket,
        itemCount: report.items.length,
        filteredCount,
        page,
        perPage,
        pageCount,
        truncated: filteredCount > perPage,
        items: sorted.slice(offset, offset + perPage),
    };
}
