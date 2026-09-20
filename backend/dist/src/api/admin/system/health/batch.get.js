"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const cache_1 = require("@b/utils/cache");
const redis_1 = require("@b/utils/redis");
const mode_1 = require("@b/cron/mode");
const heartbeat_1 = require("@b/cron/heartbeat");
const date_fns_1 = require("date-fns");
const evm_rpc_1 = require("@b/utils/evm-rpc");
const rpc_pool_1 = require("@b/utils/rpc-pool");
const emails_1 = require("@b/utils/emails");
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const sla_1 = require("@b/utils/sla");
exports.metadata = {
    summary: "Gets batch system health status",
    operationId: "getBatchSystemHealth",
    tags: ["Admin", "System", "Health"],
    responses: {
        200: {
            description: "System health status fetched successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            overall: {
                                type: "object",
                                properties: {
                                    score: { type: "number" },
                                    status: { type: "string" },
                                },
                            },
                            services: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        status: { type: "string" },
                                        message: { type: "string" },
                                        latency: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: "Unauthorized, admin permission required",
        },
        500: {
            description: "Internal system error",
        },
    },
    requiresAuth: true,
    permission: "access.admin",
    logModule: "ADMIN_SYSTEM",
    logTitle: "Get Batch System Health",
};
async function checkDatabase() {
    const start = Date.now();
    try {
        await db_1.models.user.count();
        const latency = Date.now() - start;
        return {
            name: "Database",
            status: latency > 1000 ? "warning" : "up",
            message: latency > 1000
                ? `Connected but slow (${latency}ms)`
                : `Connected (${latency}ms)`,
            latency,
            critical: true,
        };
    }
    catch (error) {
        return {
            name: "Database",
            status: "down",
            message: `Connection failed: ${(error === null || error === void 0 ? void 0 : error.message) || "Unknown error"}`,
            latency: Date.now() - start,
            critical: true,
        };
    }
}
async function checkCache() {
    const start = Date.now();
    try {
        const redis = redis_1.RedisSingleton.getInstance();
        const pong = await Promise.race([
            redis.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Redis ping timeout")), 3000)),
        ]);
        const latency = Date.now() - start;
        if (pong === "PONG") {
            return {
                name: "Cache (Redis)",
                status: latency > 500 ? "warning" : "up",
                message: latency > 500
                    ? `Connected but slow (${latency}ms)`
                    : `Connected (${latency}ms)`,
                latency,
                critical: true,
            };
        }
        return {
            name: "Cache (Redis)",
            status: "warning",
            message: "Redis connected but unexpected response",
            latency,
            critical: true,
        };
    }
    catch (error) {
        const errorMessage = (error === null || error === void 0 ? void 0 : error.message) || "";
        return {
            name: "Cache (Redis)",
            status: "down",
            message: `Redis unreachable: ${errorMessage || "Unknown error"}. Scheduled jobs and cross-process cache invalidation are stopped until it returns.`,
            critical: true,
        };
    }
}
const SCHEDULER_BOOT_GRACE_SECONDS = 240;
async function checkScheduler() {
    const mode = (0, mode_1.cronMode)();
    let observed = null;
    try {
        observed = await (0, heartbeat_1.readSchedulerHeartbeat)();
    }
    catch (error) {
        return {
            name: "Scheduler (Cron)",
            status: "warning",
            message: "Cannot determine whether the scheduler is running: the heartbeat lives in Redis and " +
                `Redis could not be read (${(error === null || error === void 0 ? void 0 : error.message) || "unknown error"}). See the cache check above.`,
            critical: false,
        };
    }
    const seconds = (ms) => `${Math.round(ms / 1000)}s`;
    if (observed && observed.beat.peer && observed.ageMs < heartbeat_1.SCHEDULER_STALE_MS) {
        const peer = observed.beat.peer;
        return {
            name: "Scheduler (Cron)",
            status: "down",
            message: `TWO processes are registering cron jobs: ${observed.beat.instanceId} and ` +
                `${peer.instanceId}. Every scheduled job can run twice over the same rows, ` +
                "withdrawals included. Exactly one process may schedule — run `pnpm start` (it reconciles " +
                "the PM2 scheduler layout) and stop anything started outside it.",
            critical: true,
        };
    }
    if (mode !== "off") {
        const jobs = observed ? ` — ${observed.beat.jobs} jobs registered` : "";
        return {
            name: "Scheduler (Cron)",
            status: "up",
            message: mode === "only"
                ? `Running in this process (CRON_MODE=only)${jobs}`
                : `Running inside this backend process (CRON_MODE=inline)${jobs}`,
            critical: true,
        };
    }
    if (!observed) {
        const booting = process.uptime() < SCHEDULER_BOOT_GRACE_SECONDS;
        return {
            name: "Scheduler (Cron)",
            status: booting ? "warning" : "down",
            message: booting
                ? "Waiting for the `cron` process to report in — this backend started " +
                    `${Math.round(process.uptime())}s ago and the scheduler boots alongside it. If this ` +
                    "does not clear within a few minutes, check `pm2 logs cron`."
                : "NO scheduler is running. This backend has CRON_MODE=off, so the separate `cron` " +
                    "process owns every scheduled job — and it has not reported in. Nothing is being " +
                    "processed: no withdrawals, no price updates, no settlement, no expiries. Start it " +
                    "with `pnpm start` and check `pm2 list` / `pm2 logs cron`.",
            critical: !booting,
        };
    }
    if (observed.ageMs > heartbeat_1.SCHEDULER_STALE_MS) {
        return {
            name: "Scheduler (Cron)",
            status: "down",
            message: `The scheduler stopped reporting ${seconds(observed.ageMs)} ago (last seen on ` +
                `${observed.beat.instanceId}). Scheduled work is not running. Check \`pm2 logs cron\`.`,
            critical: true,
        };
    }
    return {
        name: "Scheduler (Cron)",
        status: "up",
        message: `Cron process alive on ${observed.beat.instanceId} (${observed.beat.jobs} jobs, last beat ` +
            `${seconds(observed.ageMs)} ago)`,
        latency: observed.ageMs,
        critical: true,
    };
}
async function checkEmail() {
    try {
        const emailer = process.env.APP_EMAILER || "nodemailer-service";
        let configured = false;
        let provider = emailer;
        switch (emailer === null || emailer === void 0 ? void 0 : emailer.toLowerCase()) {
            case "local":
                configured = true;
                provider = "Local (Sendmail)";
                break;
            case "nodemailer-smtp":
                configured = !!(process.env.APP_NODEMAILER_SMTP_HOST &&
                    process.env.APP_NODEMAILER_SMTP_SENDER);
                provider = "SMTP";
                break;
            case "nodemailer-service":
                configured = !!(process.env.APP_NODEMAILER_SERVICE &&
                    process.env.APP_NODEMAILER_SERVICE_SENDER &&
                    process.env.APP_NODEMAILER_SERVICE_PASSWORD);
                provider = process.env.APP_NODEMAILER_SERVICE || "Nodemailer Service";
                break;
            case "nodemailer-sendgrid":
                configured = !!process.env.APP_SENDGRID_API_KEY;
                provider = "SendGrid";
                break;
            default:
                configured = !!emailer;
                provider = emailer || "Unknown";
        }
        if ((0, emails_1.mailDisabled)()) {
            return {
                name: "Email Service",
                status: "down",
                message: `MAIL_DISABLED is set in .env, so NO mail is being sent — ${configured ? `${provider} is configured but never called` : "and no provider is configured either"}. Verification codes, password resets and withdrawal confirmations are all dropped ` +
                    "before they reach the queue. Unset it (or set it to false) and restart the backend to resume delivery.",
                critical: false,
            };
        }
        return {
            name: "Email Service",
            status: configured ? "up" : "unconfigured",
            message: configured
                ? `${provider} configured (credentials present; no delivery was attempted by this check)`
                : "Email not configured",
            critical: false,
        };
    }
    catch (error) {
        return {
            name: "Email Service",
            status: "warning",
            message: `Check failed: ${(error === null || error === void 0 ? void 0 : error.message) || "Unknown error"}`,
            critical: false,
        };
    }
}
async function checkExchangeProviders() {
    var _a;
    try {
        const activeProvider = await ((_a = db_1.models.exchange) === null || _a === void 0 ? void 0 : _a.findOne({
            where: { status: true },
        }));
        if (!activeProvider) {
            return {
                name: "Exchange Provider",
                status: "unconfigured",
                message: "No exchange provider configured",
                critical: false,
            };
        }
        const providerName = activeProvider.name;
        const apiKey = process.env[`APP_${providerName.toUpperCase()}_API_KEY`];
        const apiSecret = process.env[`APP_${providerName.toUpperCase()}_API_SECRET`];
        if (!apiKey || !apiSecret) {
            return {
                name: "Exchange Provider",
                status: "warning",
                message: `${providerName} enabled but API credentials missing`,
                critical: false,
            };
        }
        return {
            name: "Exchange Provider",
            status: "up",
            message: `${providerName} configured`,
            critical: false,
        };
    }
    catch (error) {
        return {
            name: "Exchange Provider",
            status: "warning",
            message: "Could not verify exchange provider",
            critical: false,
        };
    }
}
async function checkPendingTransactions() {
    try {
        if (!db_1.models.transaction) {
            return {
                name: "Transaction Queue",
                status: "up",
                message: "Transaction system ready",
                critical: false,
            };
        }
        const pendingCount = await db_1.models.transaction.count({
            where: {
                status: "PENDING",
            },
        });
        const stuckCount = await db_1.models.transaction.count({
            where: {
                status: "PENDING",
                createdAt: {
                    [sequelize_1.Op.lt]: (0, sla_1.slaCutoff)("transaction"),
                },
            },
        });
        if (stuckCount > 0) {
            return {
                name: "Transaction Queue",
                status: "warning",
                message: `${stuckCount} stuck transactions (>72h)`,
                critical: false,
            };
        }
        if (pendingCount > 500) {
            return {
                name: "Transaction Queue",
                status: "warning",
                message: `High queue: ${pendingCount} pending`,
                critical: false,
            };
        }
        return {
            name: "Transaction Queue",
            status: "up",
            message: pendingCount > 0 ? `${pendingCount} pending` : "No pending",
            critical: false,
        };
    }
    catch (error) {
        return {
            name: "Transaction Queue",
            status: "up",
            message: "Transaction system ready",
            critical: false,
        };
    }
}
async function checkPendingWithdrawals() {
    try {
        if (!db_1.models.transaction) {
            return {
                name: "Withdrawal Queue",
                status: "up",
                message: "Withdrawal system ready",
                critical: false,
            };
        }
        const pendingCount = await db_1.models.transaction.count({
            where: {
                type: "WITHDRAW",
                status: "PENDING",
            },
        });
        const oldPendingCount = await db_1.models.transaction.count({
            where: {
                type: "WITHDRAW",
                status: "PENDING",
                createdAt: {
                    [sequelize_1.Op.lt]: (0, sla_1.slaCutoff)("withdrawal"),
                },
            },
        });
        if (oldPendingCount > 0) {
            return {
                name: "Withdrawal Queue",
                status: "warning",
                message: `${oldPendingCount} withdrawals pending >7 days`,
                critical: false,
            };
        }
        return {
            name: "Withdrawal Queue",
            status: "up",
            message: pendingCount > 0 ? `${pendingCount} pending` : "No pending",
            critical: false,
        };
    }
    catch (error) {
        return {
            name: "Withdrawal Queue",
            status: "up",
            message: "Withdrawal system ready",
            critical: false,
        };
    }
}
async function checkKYCBacklog() {
    try {
        if (!db_1.models.kycApplication) {
            return {
                name: "KYC Queue",
                status: "up",
                message: "KYC system ready",
                critical: false,
            };
        }
        const pendingCount = await db_1.models.kycApplication.count({
            where: {
                status: "PENDING",
            },
        });
        const oldPendingCount = await db_1.models.kycApplication.count({
            where: {
                status: "PENDING",
                createdAt: {
                    [sequelize_1.Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
        });
        if (oldPendingCount > 0) {
            return {
                name: "KYC Queue",
                status: "warning",
                message: `${oldPendingCount} KYC applications pending >7 days`,
                critical: false,
            };
        }
        if (pendingCount > 50) {
            return {
                name: "KYC Queue",
                status: "warning",
                message: `High backlog: ${pendingCount} pending KYC`,
                critical: false,
            };
        }
        return {
            name: "KYC Queue",
            status: "up",
            message: `${pendingCount} pending KYC applications`,
            critical: false,
        };
    }
    catch (error) {
        return {
            name: "KYC Queue",
            status: "warning",
            message: "Could not check KYC queue",
            critical: false,
        };
    }
}
async function checkSupportTickets() {
    try {
        if (!db_1.models.supportTicket) {
            return {
                name: "Support Queue",
                status: "up",
                message: "No open tickets",
                critical: false,
            };
        }
        const openCount = await db_1.models.supportTicket.count({
            where: {
                status: "OPEN",
            },
        });
        const urgentCount = await db_1.models.supportTicket.count({
            where: {
                status: "OPEN",
                importance: "HIGH",
            },
        });
        if (urgentCount > 0) {
            return {
                name: "Support Queue",
                status: "warning",
                message: `${urgentCount} high priority tickets open`,
                critical: false,
            };
        }
        return {
            name: "Support Queue",
            status: "up",
            message: `${openCount} open tickets`,
            critical: false,
        };
    }
    catch (error) {
        return {
            name: "Support Queue",
            status: "up",
            message: "Support system ready",
            critical: false,
        };
    }
}
async function checkErrorRate() {
    try {
        if (!db_1.models.transaction) {
            return {
                name: "Error Rate",
                status: "up",
                message: "No errors detected",
                critical: false,
            };
        }
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [totalCount, failedCount] = await Promise.all([
            db_1.models.transaction.count({
                where: {
                    createdAt: { [sequelize_1.Op.gte]: last24h },
                },
            }),
            db_1.models.transaction.count({
                where: {
                    status: "FAILED",
                    createdAt: { [sequelize_1.Op.gte]: last24h },
                },
            }),
        ]);
        if (totalCount === 0) {
            return {
                name: "Error Rate",
                status: "up",
                message: "No transactions in last 24h",
                critical: false,
            };
        }
        const errorRate = (failedCount / totalCount) * 100;
        if (errorRate > 10) {
            return {
                name: "Error Rate",
                status: "warning",
                message: `High error rate: ${errorRate.toFixed(1)}% (${failedCount}/${totalCount})`,
                critical: true,
            };
        }
        if (errorRate > 5) {
            return {
                name: "Error Rate",
                status: "warning",
                message: `Elevated error rate: ${errorRate.toFixed(1)}%`,
                critical: false,
            };
        }
        return {
            name: "Error Rate",
            status: "up",
            message: `${errorRate.toFixed(1)}% error rate (24h)`,
            critical: false,
        };
    }
    catch (error) {
        return {
            name: "Error Rate",
            status: "warning",
            message: "Could not calculate error rate",
            critical: false,
        };
    }
}
async function checkWalletService() {
    try {
        const cacheManager = cache_1.CacheManager.getInstance();
        const extensions = await cacheManager.getExtensions();
        if (!extensions.has("ecosystem") && !extensions.has("wallet_connect")) {
            return null;
        }
        const networks = ["ETH", "BSC", "POLYGON", "FTM", "ARBITRUM", "OPTIMISM"];
        let configured = false;
        let connectedNetwork = "";
        for (const network of networks) {
            const rpc = process.env[`${network}_MAINNET_RPC`] ||
                process.env[`${network}_TESTNET_RPC`];
            if ((0, rpc_pool_1.parseRpcEndpoints)(rpc).length > 0) {
                configured = true;
                try {
                    await (0, evm_rpc_1.probeAnyEvmRpcBlockNumber)(rpc, 5000);
                    connectedNetwork = network;
                    break;
                }
                catch (_a) {
                }
            }
        }
        if (!configured) {
            return {
                name: "Blockchain RPC",
                status: "unconfigured",
                message: "No blockchain RPC configured",
                critical: false,
            };
        }
        if (connectedNetwork) {
            return {
                name: "Blockchain RPC",
                status: "up",
                message: `${connectedNetwork} connected`,
                critical: false,
            };
        }
        return {
            name: "Blockchain RPC",
            status: "warning",
            message: "RPC configured but connection failed",
            critical: false,
        };
    }
    catch (error) {
        return {
            name: "Blockchain RPC",
            status: "warning",
            message: "Could not verify blockchain connectivity",
            critical: false,
        };
    }
}
exports.default = async (data) => {
    var _a, _b;
    const { ctx } = data;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Running batch health checks");
        const checkPromises = [
            checkDatabase(),
            checkCache(),
            checkScheduler(),
            checkEmail(),
            checkExchangeProviders(),
            checkPendingTransactions(),
            checkPendingWithdrawals(),
            checkKYCBacklog(),
            checkSupportTickets(),
            checkErrorRate(),
            checkWalletService(),
        ];
        const results = await Promise.all(checkPromises);
        const services = results.filter((r) => r !== null);
        let score = 100;
        let criticalDown = false;
        for (const service of services) {
            if (service.status === "down") {
                if (service.critical) {
                    criticalDown = true;
                    score -= 40;
                }
                else {
                    score -= 15;
                }
            }
            else if (service.status === "warning") {
                if (service.critical) {
                    score -= 15;
                }
                else {
                    score -= 5;
                }
            }
        }
        score = Math.max(0, score);
        let overallStatus;
        if (criticalDown || score < 50) {
            overallStatus = "critical";
        }
        else if (score < 80) {
            overallStatus = "warning";
        }
        else {
            overallStatus = "healthy";
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "Batch health checks completed");
        return {
            overall: {
                score,
                status: overallStatus,
            },
            services,
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
    catch (error) {
        return {
            overall: {
                score: 50,
                status: "warning",
            },
            services: [
                {
                    name: "Health Check",
                    status: "warning",
                    message: `Health check error: ${(error === null || error === void 0 ? void 0 : error.message) || "Unknown error"}`,
                    critical: false,
                },
            ],
            timestamp: (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss"),
        };
    }
};
