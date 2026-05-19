"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Get ICO Offering (Admin)",
    description: "Retrieves a single ICO offering by its ID for admin review and management, including calculated metrics (with rejected investments), platform averages, and timeline events.",
    operationId: "getIcoOfferingAdmin",
    tags: ["ICO", "Admin", "Offerings"],
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Get ICO Offer",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "The ID of the ICO offering." },
        },
    ],
    responses: {
        200: {
            description: "ICO offering retrieved successfully with calculated metrics, platform averages, and timeline events.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        description: "An object containing the ICO offering record, its computed metrics (including rejected funds), platform averages, and timeline events.",
                    },
                },
            },
        },
        401: { description: "Unauthorized – Admin privileges required." },
        404: { description: "ICO offering not found." },
        500: { description: "Internal Server Error" },
    },
    permission: "view.ico.offer",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const { user, params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin privileges required.",
        });
    }
    const id = params.id;
    if (!id || typeof id !== "string") {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid offering ID." });
    }
    const offering = await db_1.models.icoTokenOffering.findOne({
        where: { id },
        include: [
            {
                model: db_1.models.icoTokenDetail,
                as: "tokenDetail",
                include: [{ model: db_1.models.icoTokenType, as: "tokenTypeData" }]
            },
            { model: db_1.models.icoLaunchPlan, as: "plan" },
            {
                model: db_1.models.icoTokenOfferingUpdate,
                as: "updates",
                include: [{ model: db_1.models.user, as: "user" }],
            },
            { model: db_1.models.icoTokenOfferingPhase, as: "phases" },
            { model: db_1.models.icoRoadmapItem, as: "roadmapItems" },
            { model: db_1.models.icoAdminActivity, as: "adminActivities" },
            { model: db_1.models.user, as: "user" },
        ],
    });
    if (!offering) {
        throw (0, error_1.createError)({ statusCode: 404, message: "ICO offering not found." });
    }
    const cacheManager = cache_1.CacheManager.getInstance();
    const minInvestmentSetting = await cacheManager.getSetting("icoMinInvestmentAmount");
    const minInvestmentAmount = Number(minInvestmentSetting) || 100;
    const msPerDay = 1000 * 60 * 60 * 24;
    const startDate = offering.startDate ? new Date(offering.startDate) : null;
    const endDate = offering.endDate ? new Date(offering.endDate) : null;
    if (!startDate) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Offering start date is missing.",
        });
    }
    const now = new Date();
    const durationDays = offering.status === "SUCCESS" && endDate
        ? Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay)
        : Math.floor((now.getTime() - startDate.getTime()) / msPerDay);
    const [offeringTxAggregates, investorAggregates] = (await Promise.all([
        db_1.models.icoTransaction.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status NOT IN ('REJECTED') THEN price * amount ELSE 0 END")),
                    "computedRaised",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = 'REJECTED' THEN price * amount ELSE 0 END")),
                    "rejectedFunds",
                ],
            ],
            where: { offeringId: id },
            raw: true,
        }),
        db_1.models.icoTransaction.findAll({
            attributes: [
                "userId",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("price * amount")), "totalCost"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("id")), "transactionCount"],
            ],
            where: {
                offeringId: id,
                status: { [sequelize_1.Op.not]: ["REJECTED"] },
            },
            group: ["userId"],
            raw: true,
        }),
    ]));
    const computedCurrentRaised = parseFloat(offeringTxAggregates === null || offeringTxAggregates === void 0 ? void 0 : offeringTxAggregates.computedRaised) || 0;
    const rejectedInvestment = parseFloat(offeringTxAggregates === null || offeringTxAggregates === void 0 ? void 0 : offeringTxAggregates.rejectedFunds) || 0;
    const fundingRate = computedCurrentRaised / (durationDays || 1);
    const avgInvestment = computedCurrentRaised / (offering.participants || 1);
    const completionTime = durationDays;
    const largestInvestment = investorAggregates.reduce((max, inv) => {
        const totalCost = Number(inv.totalCost) || 0;
        return totalCost > max ? totalCost : max;
    }, 0);
    const totalTransactions = investorAggregates.reduce((sum, inv) => sum + Number(inv.transactionCount), 0);
    const transactionsPerInvestor = investorAggregates.length > 0
        ? totalTransactions / investorAggregates.length
        : 0;
    const metrics = {
        avgInvestment,
        fundingRate,
        largestInvestment,
        smallestInvestment: minInvestmentAmount,
        transactionsPerInvestor,
        completionTime,
        rejectedInvestment,
        currentRaised: computedCurrentRaised,
    };
    const [totalRaisedAllRow, offeringsData, platformLargestRow, transactionsAggregate, platformRejectedAggregate,] = await Promise.all([
        db_1.models.icoTransaction.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("price * amount")), "totalRaisedAll"]],
            include: [
                {
                    model: db_1.models.icoTokenOffering,
                    as: "offering",
                    attributes: [],
                    where: { status: { [sequelize_1.Op.in]: ["ACTIVE", "SUCCESS"] } },
                },
            ],
            raw: true,
        }),
        db_1.models.icoTokenOffering.findOne({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("participants")), "totalParticipants"],
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("TIMESTAMPDIFF(DAY, startDate, endDate)")),
                    "avgDuration",
                ],
            ],
            where: { status: { [sequelize_1.Op.in]: ["ACTIVE", "SUCCESS"] } },
            raw: true,
        }),
        db_1.models.icoTokenOffering.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("MAX", (0, sequelize_1.literal)(`(SELECT SUM(amount * price) FROM ico_transaction
                       WHERE ico_transaction.offeringId = icoTokenOffering.id
                       AND status IN ('PENDING', 'RELEASED'))`)),
                    "maxInvestment",
                ],
            ],
            raw: true,
        }),
        db_1.models.icoTransaction.findOne({
            attributes: [
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("price * amount")), "totalCost"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("id")), "transactionCount"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("userId"))), "investorCount"],
            ],
            where: { status: { [sequelize_1.Op.not]: ["REJECTED"] } },
            raw: true,
        }),
        db_1.models.icoTransaction.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("price * amount")), 0),
                    "rejectedFunds",
                ],
            ],
            where: { status: "REJECTED" },
            raw: true,
        }),
    ]);
    const totalRaisedAll = parseFloat((_a = totalRaisedAllRow === null || totalRaisedAllRow === void 0 ? void 0 : totalRaisedAllRow.totalRaisedAll) !== null && _a !== void 0 ? _a : "0");
    const totalParticipants = parseFloat((_b = offeringsData === null || offeringsData === void 0 ? void 0 : offeringsData.totalParticipants) !== null && _b !== void 0 ? _b : "0");
    const avgDuration = parseFloat((_c = offeringsData === null || offeringsData === void 0 ? void 0 : offeringsData.avgDuration) !== null && _c !== void 0 ? _c : "0");
    const platformAvgInvestment = totalParticipants > 0 ? totalRaisedAll / totalParticipants : 0;
    const platformFundingRate = avgDuration > 0 ? totalRaisedAll / avgDuration : 0;
    const platformLargestInvestment = platformLargestRow
        ? parseFloat((_d = platformLargestRow.maxInvestment) !== null && _d !== void 0 ? _d : "0")
        : 0;
    const platformSmallestInvestment = minInvestmentAmount;
    const totalTransactionCount = parseFloat((_e = transactionsAggregate === null || transactionsAggregate === void 0 ? void 0 : transactionsAggregate.transactionCount) !== null && _e !== void 0 ? _e : "0");
    const investorCount = parseFloat((_f = transactionsAggregate === null || transactionsAggregate === void 0 ? void 0 : transactionsAggregate.investorCount) !== null && _f !== void 0 ? _f : "0");
    const platformTransactionsPerInvestor = investorCount > 0 ? totalTransactionCount / investorCount : 0;
    const platformCompletionTime = avgDuration;
    const platformRejectedInvestment = parseFloat((_g = platformRejectedAggregate === null || platformRejectedAggregate === void 0 ? void 0 : platformRejectedAggregate.rejectedFunds) !== null && _g !== void 0 ? _g : "0");
    const platformMetrics = {
        avgInvestment: platformAvgInvestment,
        fundingRate: platformFundingRate,
        largestInvestment: platformLargestInvestment,
        smallestInvestment: platformSmallestInvestment,
        transactionsPerInvestor: platformTransactionsPerInvestor,
        completionTime: platformCompletionTime,
        rejectedInvestment: platformRejectedInvestment,
    };
    const timeline = computeIcoOfferTimeline(offering, ctx);
    return { offering, metrics, platformMetrics, timeline };
};
function safeToISOString(dateValue) {
    if (!dateValue)
        return null;
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime()))
            return null;
        return date.toISOString();
    }
    catch (_a) {
        return null;
    }
}
function computeIcoOfferTimeline(offering, ctx) {
    var _a;
    const timelineEvents = [];
    const msPerDay = 1000 * 60 * 60 * 24;
    const createdAtISO = safeToISOString(offering.createdAt);
    if (createdAtISO) {
        timelineEvents.push({
            id: "created",
            type: "created",
            timestamp: createdAtISO,
            adminName: "System",
            details: "Offering created",
        });
    }
    const startDateISO = safeToISOString(offering.startDate);
    if (startDateISO && offering.status === "ACTIVE") {
        timelineEvents.push({
            id: "launched",
            type: "launched",
            timestamp: startDateISO,
            adminName: "System",
            details: "Offering launched",
        });
    }
    const endDateISO = safeToISOString(offering.endDate);
    if (endDateISO) {
        timelineEvents.push({
            id: "completed",
            type: "completed",
            timestamp: endDateISO,
            adminName: "System",
            details: "Offering completed",
        });
    }
    const submittedAtISO = safeToISOString(offering.submittedAt);
    if (submittedAtISO) {
        timelineEvents.push({
            id: "submitted",
            type: "submission",
            timestamp: submittedAtISO,
            adminName: ((_a = offering.user) === null || _a === void 0 ? void 0 : _a.name) || "Creator",
            details: "Offering submitted for review",
        });
    }
    const approvedAtISO = safeToISOString(offering.approvedAt);
    if (approvedAtISO) {
        timelineEvents.push({
            id: "approved",
            type: "approval",
            timestamp: approvedAtISO,
            adminName: "Admin",
            details: "Offering approved",
        });
    }
    const rejectedAtISO = safeToISOString(offering.rejectedAt);
    if (rejectedAtISO) {
        timelineEvents.push({
            id: "rejected",
            type: "rejection",
            timestamp: rejectedAtISO,
            adminName: "Admin",
            details: "Offering rejected",
        });
    }
    if (offering.updates && Array.isArray(offering.updates)) {
        offering.updates.forEach((update) => {
            var _a;
            const updateTimestamp = safeToISOString(update.createdAt);
            if (updateTimestamp) {
                timelineEvents.push({
                    id: update.id,
                    type: "note",
                    timestamp: updateTimestamp,
                    adminName: ((_a = update.user) === null || _a === void 0 ? void 0 : _a.name) || "Admin",
                    details: `${update.title}: ${update.content}`,
                });
            }
        });
    }
    if (offering.roadmapItems && Array.isArray(offering.roadmapItems)) {
        offering.roadmapItems.forEach((item) => {
            const itemTimestamp = safeToISOString(item.date);
            if (itemTimestamp) {
                timelineEvents.push({
                    id: `roadmap-${item.id}`,
                    type: "milestone",
                    timestamp: itemTimestamp,
                    adminName: "System",
                    details: `${item.title} - ${item.description}`,
                    important: item.completed,
                });
            }
        });
    }
    if (offering.phases && Array.isArray(offering.phases)) {
        const offeringStartDate = offering.startDate ? new Date(offering.startDate) : null;
        let computedPhaseStart = offeringStartDate && !isNaN(offeringStartDate.getTime()) ? offeringStartDate : null;
        offering.phases.forEach((phase) => {
            let phaseTimestamp = safeToISOString(phase.startDate);
            if (!phaseTimestamp && computedPhaseStart) {
                phaseTimestamp = computedPhaseStart.toISOString();
            }
            if (phaseTimestamp) {
                timelineEvents.push({
                    id: `phase-${phase.id}`,
                    type: "phase",
                    timestamp: phaseTimestamp,
                    adminName: "System",
                    details: `Phase ${phase.name} started. Token Price: ${phase.tokenPrice}`,
                });
            }
            if (computedPhaseStart && phase.duration) {
                computedPhaseStart = new Date(computedPhaseStart.getTime() + phase.duration * msPerDay);
            }
        });
    }
    if (offering.adminActivities && Array.isArray(offering.adminActivities)) {
        offering.adminActivities.forEach((activity) => {
            const activityTimestamp = safeToISOString(activity.createdAt);
            if (activityTimestamp) {
                timelineEvents.push({
                    id: `activity-${activity.id}`,
                    type: activity.type || "activity",
                    timestamp: activityTimestamp,
                    adminName: activity.adminName || "Admin",
                    details: activity.details || "",
                });
            }
        });
    }
    timelineEvents.forEach((event) => {
        event.offeringId = offering.id;
        event.offeringName = offering.name;
    });
    timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get ICO Offer retrieved successfully");
    return timelineEvents;
}
