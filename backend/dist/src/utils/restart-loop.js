"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkForRestartLoop = checkForRestartLoop;
const fs_1 = __importDefault(require("fs"));
const redis_1 = require("@b/utils/redis");
const console_1 = require("@b/utils/console");
const process_role_1 = require("@b/utils/process-role");
const isProduction = process.env.NODE_ENV === "production";
const WINDOW_MS = 5 * 60 * 1000;
const THRESHOLD = 5;
const HISTORY = 20;
const KNOWN_LOOPERS = [
    {
        path: "/etc/systemd/system/bicrypto.service",
        describe: "bicrypto.service — a systemd unit that re-runs `pnpm start` on a timer.\n" +
            "    Created by older versions of installer.sh. `pnpm start` is not a server:\n" +
            "    it hands the apps to PM2 and exits, so systemd restarts it forever.",
        fix: [
            "sudo systemctl disable --now bicrypto.service",
            "sudo rm /etc/systemd/system/bicrypto.service",
            "sudo systemctl daemon-reload",
            "pnpm start   # once, by hand — PM2 keeps it running from here",
        ],
    },
];
function knownLooper() {
    if (process.platform === "win32")
        return null;
    for (const candidate of KNOWN_LOOPERS) {
        try {
            if (fs_1.default.existsSync(candidate.path))
                return candidate;
        }
        catch (_a) {
        }
    }
    return null;
}
function report(bootsInWindow) {
    const culprit = knownLooper();
    const cause = culprit
        ? `  FOUND IT: ${culprit.describe}\n\n` +
            "  Fix, as a user with sudo:\n\n" +
            culprit.fix.map((line) => `      ${line}`).join("\n") +
            "\n"
        : "  Nothing here is crashing — every exit above is clean. Something OUTSIDE\n" +
            "  the platform is restarting it. The usual three, in order of likelihood:\n\n" +
            "      systemctl list-units --all | grep -i bicrypto   # a unit re-running `pnpm start`\n" +
            "      pm2 list                                        # a PM2 app whose script IS `pnpm start`\n" +
            "      crontab -l; sudo crontab -l                     # a cron entry calling `pnpm start`\n\n" +
            "  Any of them restarts all three apps every time it fires, because\n" +
            "  `pm2 start` on apps that already exist restarts them.\n";
    console_1.logger.warn("RESTART_LOOP", "\n" +
        "  ────────────────────────────────────────────────────────────────────\n" +
        `  THIS PROCESS HAS STARTED ${bootsInWindow} TIMES IN THE LAST ${Math.round(WINDOW_MS / 60000)} MINUTES.\n` +
        "\n" +
        cause +
        "\n" +
        "  Why it matters beyond the noise: a backend that needs longer to boot than\n" +
        "  the restart interval never reaches its listen() call, so the API port never\n" +
        "  opens and the frontend answers ECONNREFUSED — while this log fills with\n" +
        "  perfectly successful startup messages.\n" +
        "  ────────────────────────────────────────────────────────────────────\n");
}
async function checkForRestartLoop() {
    var _a;
    var _b;
    if (!isProduction)
        return;
    try {
        const { isMainThread } = require("worker_threads");
        if (!isMainThread)
            return;
        const key = `boot:history:${(0, process_role_1.processRole)()}`;
        const now = Date.now();
        const pipeline = redis_1.redisClient
            .pipeline()
            .lpush(key, String(now))
            .ltrim(key, 0, HISTORY - 1)
            .expire(key, 3600)
            .lrange(key, 0, HISTORY - 1);
        const replies = await Promise.race([
            pipeline.exec(),
            new Promise((resolve) => { var _a, _b; return (_b = (_a = setTimeout(() => resolve(null), 1000)).unref) === null || _b === void 0 ? void 0 : _b.call(_a); }),
        ]);
        if (!replies)
            return;
        const raw = (_b = (_a = replies[3]) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : [];
        const cutoff = now - WINDOW_MS;
        const recent = raw
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value >= cutoff);
        if (recent.length >= THRESHOLD)
            report(recent.length);
    }
    catch (_c) {
    }
}
