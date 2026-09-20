"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const sla_1 = require("@b/utils/sla");
exports.metadata = {
    summary: "Get the NFT moderation dashboard",
    operationId: "getNftModerationDashboard",
    tags: ["Admin", "NFT", "Dashboard"],
    description: "Server-side aggregates for the NFT admin console: collections awaiting approval, open disputes, auction settlements the cron could not complete, escrow flagged for manual release, catalogue integrity defects, and dispute inflow versus resolution over the selected window.",
    logModule: "ADMIN_NFT",
    logTitle: "Get NFT Moderation Dashboard",
    parameters: [
        {
            name: "timeRange",
            in: "query",
            description: "Window for the dispute flow series",
            required: false,
            schema: { type: "string", enum: ["24h", "7d", "30d"], default: "7d" },
        },
    ],
    responses: {
        200: {
            description: "Moderation dashboard retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            timeRange: { type: "string" },
                            generatedAt: { type: "string" },
                            source: {
                                type: "object",
                                description: "How these figures were produced. Counters are exact SQL aggregates; only the preview lists are capped.",
                                properties: {
                                    available: { type: "boolean" },
                                    error: { type: "string", nullable: true },
                                    aggregate: { type: "boolean" },
                                    scanned: { type: "number" },
                                    cap: { type: "number" },
                                    truncated: { type: "boolean" },
                                },
                            },
                            sla: {
                                type: "object",
                                description: "The hour budgets the ages on this page are measured against, from backend/src/utils/sla.ts.",
                                properties: {
                                    dispute: { type: "number" },
                                    approval: { type: "number" },
                                },
                            },
                            queues: {
                                type: "object",
                                properties: {
                                    collections: { type: "object" },
                                    disputes: { type: "object" },
                                    settlements: { type: "object" },
                                    escrow: { type: "object" },
                                    catalogue: { type: "object" },
                                },
                            },
                            catalogue: { type: "object" },
                            marketplaces: {
                                type: "object",
                                properties: {
                                    active: { type: "number" },
                                    paused: { type: "number" },
                                    deprecated: { type: "number" },
                                    contracts: { type: "array", items: { type: "object" } },
                                },
                            },
                            pendingCollections: { type: "array", items: { type: "object" } },
                            openDisputes: { type: "array", items: { type: "object" } },
                            disputeFlow: { type: "array", items: { type: "object" } },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
    requiresAuth: true,
    permission: "access.nft",
};
const RANGES = {
    "24h": { buckets: 24, hourly: true },
    "7d": { buckets: 7, hourly: false },
    "30d": { buckets: 30, hourly: false },
};
const PREVIEW_CAP = 8;
const CACHE_TTL_MS = 15000;
const cache = new Map();
const OPEN_DISPUTE_STATUSES = [
    "PENDING",
    "INVESTIGATING",
    "AWAITING_RESPONSE",
    "ESCALATED",
];
const URGENT_PRIORITIES = ["HIGH", "CRITICAL"];
const blank = (field) => [{ [field]: null }, { [field]: "" }];
function toIso(value) {
    if (!value)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function num(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
function bucketKey(date, hourly) {
    const pad = (n) => String(n).padStart(2, "0");
    const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    return hourly ? `${day} ${pad(date.getUTCHours())}:00:00` : day;
}
exports.default = async (data) => {
    const { query, ctx } = data;
    const requested = String((query === null || query === void 0 ? void 0 : query.timeRange) || "7d");
    const timeRange = ["24h", "7d", "30d"].includes(requested)
        ? requested
        : "7d";
    const cached = cache.get(timeRange);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Moderation dashboard served from cache");
        return cached.payload;
    }
    const { buckets, hourly } = RANGES[timeRange];
    const now = new Date();
    const lastBucket = new Date(now);
    if (hourly)
        lastBucket.setUTCMinutes(0, 0, 0);
    else
        lastBucket.setUTCHours(0, 0, 0, 0);
    const stepMs = hourly ? 3600000 : 86400000;
    const windowStart = new Date(lastBucket.getTime() - (buckets - 1) * stepMs);
    const openDisputeWhere = { status: { [sequelize_1.Op.in]: OPEN_DISPUTE_STATUSES } };
    const blockedListingWhere = {
        status: "ACTIVE",
        settlementBlockedAt: { [sequelize_1.Op.ne]: null },
    };
    const flaggedOfferWhere = {
        status: "ACCEPTED",
        flaggedAt: { [sequelize_1.Op.ne]: null },
    };
    const draftCutoff = (0, sla_1.slaCutoff)("approval", now.getTime());
    const bucketFormat = hourly ? "%Y-%m-%d %H:00:00" : "%Y-%m-%d";
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Counting moderation queues");
        const [pendingCollections, suspendedCollections, oldestPendingCollection, openDisputes, urgentDisputes, unassignedDisputes, oldestOpenDispute, blockedSettlements, blockedSettlementValue, oldestBlockedSettlement, flaggedEscrow, flaggedEscrowValue, oldestFlaggedEscrow, brokenListedTokens, unbackedMints, staleDrafts, mintedMissingMetadata, mintedMissingImage, marketplaceRows,] = await Promise.all([
            db_1.models.nftCollection.count({ where: { status: "PENDING" } }),
            db_1.models.nftCollection.count({ where: { status: "SUSPENDED" } }),
            db_1.models.nftCollection.min("createdAt", { where: { status: "PENDING" } }),
            db_1.models.nftDispute.count({ where: openDisputeWhere }),
            db_1.models.nftDispute.count({
                where: {
                    priority: { [sequelize_1.Op.in]: URGENT_PRIORITIES },
                    status: { [sequelize_1.Op.notIn]: ["RESOLVED", "REJECTED"] },
                },
            }),
            db_1.models.nftDispute.count({
                where: { ...openDisputeWhere, assignedToId: { [sequelize_1.Op.is]: null } },
            }),
            db_1.models.nftDispute.min("createdAt", { where: openDisputeWhere }),
            db_1.models.nftListing.count({ where: blockedListingWhere }),
            db_1.models.nftListing.findAll({
                attributes: [
                    "currency",
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("currentBid")), "value"],
                ],
                where: blockedListingWhere,
                group: ["currency"],
                raw: true,
            }),
            db_1.models.nftListing.min("settlementBlockedAt", {
                where: blockedListingWhere,
            }),
            db_1.models.nftOffer.count({ where: flaggedOfferWhere }),
            db_1.models.nftOffer.findAll({
                attributes: [
                    "currency",
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("amount")), "value"],
                ],
                where: flaggedOfferWhere,
                group: ["currency"],
                raw: true,
            }),
            db_1.models.nftOffer.min("flaggedAt", { where: flaggedOfferWhere }),
            db_1.models.nftToken.count({
                where: {
                    isListed: true,
                    [sequelize_1.Op.or]: [...blank("metadataUri"), ...blank("image")],
                },
            }),
            db_1.models.nftToken.count({
                where: { isMinted: true, [sequelize_1.Op.or]: blank("blockchainTokenId") },
            }),
            db_1.models.nftToken.count({
                where: {
                    status: "DRAFT",
                    isMinted: false,
                    createdAt: { [sequelize_1.Op.lte]: draftCutoff },
                },
            }),
            db_1.models.nftToken.count({
                where: { status: "MINTED", [sequelize_1.Op.or]: blank("metadataUri") },
            }),
            db_1.models.nftToken.count({
                where: { status: "MINTED", [sequelize_1.Op.or]: blank("image") },
            }),
            db_1.models.nftMarketplace.findAll({
                attributes: [
                    "id",
                    "chain",
                    "network",
                    "contractAddress",
                    "feePercentage",
                    "status",
                    "pauseReason",
                    "pausedAt",
                ],
                order: [
                    ["chain", "ASC"],
                    ["network", "ASC"],
                ],
            }),
        ]);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading queue previews");
        const [pendingCollectionRows, openDisputeRows, openedRows, resolvedRows] = await Promise.all([
            db_1.models.nftCollection.findAll({
                attributes: [
                    "id",
                    "name",
                    "symbol",
                    "chain",
                    "network",
                    "contractAddress",
                    "createdAt",
                ],
                where: { status: "PENDING" },
                include: [
                    {
                        model: db_1.models.nftCreator,
                        as: "creator",
                        attributes: ["id", "displayName", "isVerified"],
                        required: false,
                        include: [
                            {
                                model: db_1.models.user,
                                as: "user",
                                attributes: ["id", "firstName", "lastName", "email"],
                                required: false,
                            },
                        ],
                    },
                ],
                order: [["createdAt", "ASC"]],
                limit: PREVIEW_CAP,
            }),
            db_1.models.nftDispute.findAll({
                attributes: [
                    "id",
                    "title",
                    "disputeType",
                    "status",
                    "priority",
                    "assignedToId",
                    "createdAt",
                ],
                where: openDisputeWhere,
                include: [
                    {
                        model: db_1.models.user,
                        as: "reporter",
                        attributes: ["id", "firstName", "lastName", "email"],
                        required: false,
                    },
                ],
                order: [["createdAt", "ASC"]],
                limit: PREVIEW_CAP,
            }),
            db_1.models.nftDispute.findAll({
                attributes: [
                    [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), bucketFormat), "bucket"],
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                ],
                where: { createdAt: { [sequelize_1.Op.gte]: windowStart } },
                group: [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), bucketFormat)],
                raw: true,
            }),
            db_1.models.nftDispute.findAll({
                attributes: [
                    [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("resolvedAt"), bucketFormat), "bucket"],
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                ],
                where: { resolvedAt: { [sequelize_1.Op.gte]: windowStart } },
                group: [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("resolvedAt"), bucketFormat)],
                raw: true,
            }),
        ]);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Building payload");
        const openedByBucket = new Map();
        for (const row of openedRows) {
            openedByBucket.set(String(row.bucket), num(row.count));
        }
        const resolvedByBucket = new Map();
        for (const row of resolvedRows) {
            resolvedByBucket.set(String(row.bucket), num(row.count));
        }
        const disputeFlow = Array.from({ length: buckets }, (_, index) => {
            var _a, _b;
            const at = new Date(windowStart.getTime() + index * stepMs);
            const key = bucketKey(at, hourly);
            return {
                date: at.toISOString(),
                opened: (_a = openedByBucket.get(key)) !== null && _a !== void 0 ? _a : 0,
                resolved: (_b = resolvedByBucket.get(key)) !== null && _b !== void 0 ? _b : 0,
            };
        });
        const money = (rows) => (rows || []).map((row) => ({
            currency: row.currency || null,
            count: num(row.count),
            amount: num(row.value),
        }));
        const catalogue = {
            brokenListed: brokenListedTokens,
            unbackedMints,
            staleDrafts,
            mintedMissingMetadata,
            mintedMissingImage,
            defects: brokenListedTokens + unbackedMints + staleDrafts,
        };
        const contracts = marketplaceRows.map((row) => { var _a; return ({
            id: row.id,
            chain: row.chain,
            network: row.network,
            contractAddress: row.contractAddress,
            feePercentage: num(row.feePercentage),
            status: row.status,
            pauseReason: (_a = row.pauseReason) !== null && _a !== void 0 ? _a : null,
            pausedAt: toIso(row.pausedAt),
        }); });
        const truncated = pendingCollections > pendingCollectionRows.length ||
            openDisputes > openDisputeRows.length;
        const payload = {
            timeRange,
            generatedAt: new Date().toISOString(),
            source: {
                available: true,
                error: null,
                aggregate: true,
                scanned: pendingCollectionRows.length + openDisputeRows.length,
                cap: PREVIEW_CAP * 2,
                truncated,
            },
            sla: { dispute: sla_1.SLA_HOURS.dispute, approval: sla_1.SLA_HOURS.approval },
            queues: {
                collections: {
                    count: pendingCollections,
                    oldestAt: toIso(oldestPendingCollection),
                    suspended: suspendedCollections,
                },
                disputes: {
                    count: openDisputes,
                    oldestAt: toIso(oldestOpenDispute),
                    urgent: urgentDisputes,
                    unassigned: unassignedDisputes,
                },
                settlements: {
                    count: blockedSettlements,
                    oldestAt: toIso(oldestBlockedSettlement),
                    value: money(blockedSettlementValue),
                },
                escrow: {
                    count: flaggedEscrow,
                    oldestAt: toIso(oldestFlaggedEscrow),
                    value: money(flaggedEscrowValue),
                },
                catalogue: {
                    count: catalogue.defects,
                    oldestAt: null,
                },
            },
            catalogue,
            marketplaces: {
                active: contracts.filter((c) => c.status === "ACTIVE").length,
                paused: contracts.filter((c) => c.status === "PAUSED").length,
                deprecated: contracts.filter((c) => c.status === "DEPRECATED").length,
                contracts,
            },
            pendingCollections: pendingCollectionRows.map((row) => {
                var _a, _b, _c;
                var _d, _e;
                const plain = row.get ? row.get({ plain: true }) : row;
                const user = (_a = plain.creator) === null || _a === void 0 ? void 0 : _a.user;
                return {
                    id: plain.id,
                    name: plain.name,
                    symbol: plain.symbol,
                    chain: plain.chain,
                    network: plain.network,
                    deployed: Boolean(plain.contractAddress),
                    createdAt: toIso(plain.createdAt),
                    creator: ((_b = plain.creator) === null || _b === void 0 ? void 0 : _b.displayName) ||
                        (user
                            ? `${(_d = user.firstName) !== null && _d !== void 0 ? _d : ""} ${(_e = user.lastName) !== null && _e !== void 0 ? _e : ""}`.trim() ||
                                user.email
                            : null),
                    creatorVerified: Boolean((_c = plain.creator) === null || _c === void 0 ? void 0 : _c.isVerified),
                };
            }),
            openDisputes: openDisputeRows.map((row) => {
                var _a, _b;
                const plain = row.get ? row.get({ plain: true }) : row;
                const reporter = plain.reporter;
                return {
                    id: plain.id,
                    title: plain.title,
                    disputeType: plain.disputeType,
                    status: plain.status,
                    priority: plain.priority,
                    assigned: Boolean(plain.assignedToId),
                    createdAt: toIso(plain.createdAt),
                    reporter: reporter
                        ? `${(_a = reporter.firstName) !== null && _a !== void 0 ? _a : ""} ${(_b = reporter.lastName) !== null && _b !== void 0 ? _b : ""}`.trim() ||
                            reporter.email
                        : null,
                };
            }),
            disputeFlow,
        };
        cache.set(timeRange, { at: Date.now(), payload });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Moderation dashboard built");
        return payload;
    }
    catch (error) {
        console_1.logger.error("ADMIN_NFT", "NFT moderation dashboard could not be built", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to build the NFT moderation dashboard");
        return {
            timeRange,
            generatedAt: new Date().toISOString(),
            source: {
                available: false,
                error: (error === null || error === void 0 ? void 0 : error.message) ||
                    "The NFT tables could not be read. The counters below are unknown, not zero.",
                aggregate: true,
                scanned: 0,
                cap: PREVIEW_CAP * 2,
                truncated: false,
            },
            sla: { dispute: sla_1.SLA_HOURS.dispute, approval: sla_1.SLA_HOURS.approval },
            queues: {
                collections: { count: 0, oldestAt: null, suspended: 0 },
                disputes: { count: 0, oldestAt: null, urgent: 0, unassigned: 0 },
                settlements: { count: 0, oldestAt: null, value: [] },
                escrow: { count: 0, oldestAt: null, value: [] },
                catalogue: { count: 0, oldestAt: null },
            },
            catalogue: {
                brokenListed: 0,
                unbackedMints: 0,
                staleDrafts: 0,
                mintedMissingMetadata: 0,
                mintedMissingImage: 0,
                defects: 0,
            },
            marketplaces: { active: 0, paused: 0, deprecated: 0, contracts: [] },
            pendingCollections: [],
            openDisputes: [],
            disputeFlow: [],
        };
    }
};
