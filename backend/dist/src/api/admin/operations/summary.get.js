"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const sla_1 = require("@b/utils/sla");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
function queue(def) {
    const { modelName, where, dateField = "createdAt", ...rest } = def;
    const model = () => {
        const m = db_1.models[modelName];
        if (!(m === null || m === void 0 ? void 0 : m.count))
            throw new Error(`model ${modelName} unavailable`);
        return m;
    };
    return {
        ...rest,
        count: () => model().count({ where }),
        oldest: async () => (await model().min(dateField, { where })),
        breached: () => model().count({
            where: { ...where, [dateField]: { [sequelize_1.Op.lt]: (0, sla_1.slaCutoff)(rest.sla) } },
        }),
    };
}
const CORE_QUEUES = [
    queue({
        key: "verification",
        label: "Verification",
        href: "/admin/crm/kyc/application",
        permission: "access.kyc.application",
        sla: "kyc",
        group: "core",
        modelName: "kycApplication",
        where: { status: "PENDING" },
    }),
    queue({
        key: "withdrawals",
        label: "Withdrawals",
        href: "/admin/finance/withdraw/log",
        permission: "access.withdraw",
        sla: "withdrawal",
        group: "core",
        modelName: "transaction",
        where: { type: "WITHDRAW", status: "PENDING" },
    }),
    queue({
        key: "deposits",
        label: "Deposits",
        href: "/admin/finance/deposit/log",
        permission: "access.deposit",
        sla: "deposit",
        group: "core",
        modelName: "transaction",
        where: { type: "DEPOSIT", status: "PENDING" },
    }),
    queue({
        key: "transfers",
        label: "Transfers",
        href: "/admin/finance/transfer",
        permission: "access.transfer",
        sla: "transfer",
        group: "core",
        modelName: "transaction",
        where: { type: "OUTGOING_TRANSFER", status: "PENDING" },
    }),
    queue({
        key: "support",
        label: "Support",
        href: "/admin/crm/support",
        permission: "access.support.ticket",
        sla: "support",
        group: "core",
        modelName: "supportTicket",
        where: { status: { [sequelize_1.Op.in]: ["PENDING", "OPEN"] } },
    }),
];
const ADDON_QUEUES = [
    queue({
        key: "p2p-disputes",
        label: "P2P Disputes",
        href: "/admin/p2p/dispute",
        permission: "access.p2p.dispute",
        sla: "dispute",
        group: "addon",
        extension: "p2p",
        modelName: "p2pDispute",
        where: { status: { [sequelize_1.Op.in]: ["PENDING", "IN_PROGRESS"] } },
    }),
    queue({
        key: "p2p-offers",
        label: "P2P Offers",
        href: "/admin/p2p/offer",
        permission: "access.p2p.offer",
        sla: "approval",
        group: "addon",
        extension: "p2p",
        modelName: "p2pOffer",
        where: { status: "PENDING_APPROVAL" },
    }),
    queue({
        key: "nft-disputes",
        label: "NFT Disputes",
        href: "/admin/nft/dispute",
        permission: "access.nft.dispute",
        sla: "dispute",
        group: "addon",
        extension: "nft",
        modelName: "nftDispute",
        where: { status: { [sequelize_1.Op.in]: ["PENDING", "INVESTIGATING", "ESCALATED"] } },
    }),
    queue({
        key: "nft-collections",
        label: "NFT Collections",
        href: "/admin/nft/collection",
        permission: "access.nft.collection",
        sla: "approval",
        group: "addon",
        extension: "nft",
        modelName: "nftCollection",
        where: { status: "PENDING" },
    }),
    queue({
        key: "ecommerce-orders",
        label: "Store Orders",
        href: "/admin/ecommerce/order",
        permission: "access.ecommerce.order",
        sla: "order",
        group: "addon",
        extension: "ecommerce",
        modelName: "ecommerceOrder",
        where: { status: "PENDING" },
    }),
    queue({
        key: "ecommerce-shipping",
        label: "Shipments",
        href: "/admin/ecommerce/shipping",
        permission: "access.ecommerce.shipping",
        sla: "order",
        group: "addon",
        extension: "ecommerce",
        modelName: "ecommerceShipping",
        where: { loadStatus: "PENDING" },
    }),
    queue({
        key: "gateway-payouts",
        label: "Merchant Payouts",
        href: "/admin/gateway/payout",
        permission: "access.gateway.payout",
        sla: "withdrawal",
        group: "addon",
        extension: "gateway",
        modelName: "gatewayPayout",
        where: { status: "PENDING" },
    }),
    queue({
        key: "gateway-refunds",
        label: "Refunds",
        href: "/admin/gateway/payment",
        permission: "access.gateway.payment",
        sla: "order",
        group: "addon",
        extension: "gateway",
        modelName: "gatewayRefund",
        where: { status: "PENDING" },
    }),
    queue({
        key: "gateway-merchants",
        label: "Merchant Applications",
        href: "/admin/gateway/merchant",
        permission: "access.gateway.merchant",
        sla: "approval",
        group: "addon",
        extension: "gateway",
        modelName: "gatewayMerchant",
        where: { status: "PENDING" },
    }),
    queue({
        key: "forex-deposits",
        label: "Forex Deposits",
        href: "/admin/forex/deposit",
        permission: "access.forex.deposit",
        sla: "deposit",
        group: "addon",
        extension: "forex",
        modelName: "transaction",
        where: { type: "FOREX_DEPOSIT", status: "PENDING" },
    }),
    queue({
        key: "forex-withdrawals",
        label: "Forex Withdrawals",
        href: "/admin/forex/withdraw",
        permission: "access.forex.withdraw",
        sla: "withdrawal",
        group: "addon",
        extension: "forex",
        modelName: "transaction",
        where: { type: "FOREX_WITHDRAW", status: "PENDING" },
    }),
    queue({
        key: "fx-withdrawals",
        label: "FX Withdrawals",
        href: "/admin/forex-trading/withdraw",
        permission: "edit.forex_trading.withdraw",
        sla: "withdrawal",
        group: "addon",
        extension: "forex_trading",
        modelName: "transaction",
        where: { type: "FX_TRADING_WITHDRAW", status: "PENDING" },
    }),
    queue({
        key: "ico-offerings",
        label: "Token Offerings",
        href: "/admin/ico/offer",
        permission: "access.ico.offer",
        sla: "approval",
        group: "addon",
        extension: "ico",
        modelName: "icoTokenOffering",
        where: { status: "PENDING" },
    }),
    queue({
        key: "staking-withdrawals",
        label: "Staking Withdrawals",
        href: "/admin/staking/position",
        permission: "access.staking.position",
        sla: "withdrawal",
        group: "addon",
        extension: "staking",
        modelName: "stakingPosition",
        where: { status: "PENDING_WITHDRAWAL" },
    }),
    queue({
        key: "mlm-referrals",
        label: "Referrals",
        href: "/admin/affiliate/referral",
        permission: "access.affiliate.referral",
        sla: "approval",
        group: "addon",
        extension: "mlm",
        modelName: "mlmReferral",
        where: { status: "PENDING" },
    }),
    queue({
        key: "copy-trading-leaders",
        label: "Leader Applications",
        href: "/admin/copy-trading/leader",
        permission: "access.copy_trading",
        sla: "approval",
        group: "addon",
        extension: "copy_trading",
        modelName: "copyTradingLeader",
        where: { status: "PENDING" },
    }),
    queue({
        key: "bot-strategies",
        label: "Bot Strategies",
        href: "/admin/trading-bot/marketplace",
        permission: "access.trading_bot.marketplace",
        sla: "approval",
        group: "addon",
        extension: "trading_bot",
        modelName: "tradingBotStrategy",
        where: { status: "PENDING_REVIEW" },
    }),
    queue({
        key: "faq-questions",
        label: "User Questions",
        href: "/admin/faq/question",
        permission: "access.faq.question",
        sla: "approval",
        group: "addon",
        extension: "knowledge_base",
        modelName: "faqQuestion",
        where: { status: "PENDING" },
    }),
    queue({
        key: "dex-tokens",
        label: "Token Listings",
        href: "/admin/dex/token",
        permission: "access.dex.token",
        sla: "approval",
        group: "addon",
        extension: "dex",
        modelName: "dexToken",
        where: { listing: "PENDING" },
    }),
    queue({
        key: "ai-support-gaps",
        label: "Knowledge Gaps",
        href: "/admin/ai/support/gaps",
        permission: "view.ai.support.knowledge",
        sla: "approval",
        group: "addon",
        extension: "ai_support",
        modelName: "aiSupportGap",
        where: { status: "OPEN" },
    }),
];
exports.metadata = {
    summary: "Pending work across every operations queue",
    description: "Per-queue pending counts, oldest item and SLA breaches — the five core queues plus a queue for every enabled extension that needs an admin decision.",
    operationId: "getOperationsSummary",
    tags: ["Admin", "Operations"],
    requiresAuth: true,
    permission: "access.admin",
    responses: {
        200: {
            description: "Per-queue pending counts, oldest item and SLA breaches",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            total: { type: "number" },
                            breached: { type: "number" },
                            queues: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        key: { type: "string" },
                                        label: { type: "string" },
                                        href: { type: "string" },
                                        permission: { type: "string" },
                                        group: { type: "string", enum: ["core", "addon"] },
                                        extension: { type: "string", nullable: true },
                                        count: { type: "number" },
                                        breached: { type: "number" },
                                        slaHours: { type: "number" },
                                        oldestAt: {
                                            type: "string",
                                            format: "date-time",
                                            nullable: true,
                                        },
                                        unavailable: { type: "boolean" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    let active = new Set();
    try {
        active = new Set((await cache_1.CacheManager.getInstance().getExtensions()).keys());
    }
    catch (error) {
        console_1.logger.warn("OPERATIONS", `Extension cache unavailable, addon queues skipped: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
    const specs = [
        ...CORE_QUEUES,
        ...ADDON_QUEUES.filter((q) => q.extension && active.has(q.extension)),
    ];
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Counting pending work");
    const queues = await Promise.all(specs.map(async (spec) => {
        var _a;
        const base = {
            key: spec.key,
            label: spec.label,
            href: spec.href,
            permission: spec.permission,
            group: spec.group,
            extension: (_a = spec.extension) !== null && _a !== void 0 ? _a : null,
            slaHours: sla_1.SLA_HOURS[spec.sla],
        };
        try {
            const [count, oldest, breached] = await Promise.all([
                spec.count(),
                spec.oldest(),
                spec.breached(),
            ]);
            return {
                ...base,
                count,
                breached,
                oldestAt: oldest ? new Date(oldest).toISOString() : null,
            };
        }
        catch (_b) {
            return {
                ...base,
                count: 0,
                breached: 0,
                oldestAt: null,
                unavailable: true,
            };
        }
    }));
    const total = queues.reduce((sum, q) => sum + q.count, 0);
    const breached = queues.reduce((sum, q) => sum + q.breached, 0);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${total} items pending, ${breached} past target`);
    return { total, breached, queues };
};
