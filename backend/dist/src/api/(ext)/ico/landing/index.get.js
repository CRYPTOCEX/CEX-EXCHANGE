"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get ICO Landing Page Data",
    description: "Retrieves comprehensive data for the ICO landing page including stats, featured offerings, upcoming projects, success stories, and platform diversity.",
    operationId: "getIcoLandingData",
    tags: ["ICO", "Landing"],
    requiresAuth: false,
    responses: {
        200: {
            description: "ICO landing data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            stats: { type: "object" },
                            featured: { type: "array" },
                            upcoming: { type: "array" },
                            successStories: { type: "array" },
                            diversity: { type: "object" },
                            launchPlans: { type: "array" },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const [statusCounts, transactionStats, featuredOfferings, upcomingOfferings, successfulOfferings, blockchainCounts, tokenTypeCounts, launchPlans,] = await Promise.all([
        db_1.models.icoTokenOffering.findAll({
            attributes: ["status", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
            group: ["status"],
            raw: true,
        }),
        db_1.models.icoTransaction.findOne({
            attributes: [
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status NOT IN ('REJECTED') THEN price * amount ELSE 0 END")),
                    "totalRaised",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`)),
                    "currentRaised",
                ],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)(`CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' AND status NOT IN ('REJECTED') THEN price * amount ELSE 0 END`)),
                    "previousRaised",
                ],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("DISTINCT userId")), "totalInvestors"],
                [
                    (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)(`DISTINCT CASE WHEN createdAt >= '${currentMonthStart.toISOString()}' THEN userId ELSE NULL END`)),
                    "currentInvestors",
                ],
                [
                    (0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)(`DISTINCT CASE WHEN createdAt BETWEEN '${previousMonthStart.toISOString()}' AND '${previousMonthEnd.toISOString()}' THEN userId ELSE NULL END`)),
                    "previousInvestors",
                ],
            ],
            raw: true,
        }),
        db_1.models.icoTokenOffering.findAll({
            where: { status: "ACTIVE", featured: true },
            include: [
                { model: db_1.models.icoTokenOfferingPhase, as: "phases" },
                {
                    model: db_1.models.icoTokenDetail,
                    as: "tokenDetail",
                    attributes: ["description", "blockchain", "tokenType"],
                },
                {
                    model: db_1.models.icoTeamMember,
                    as: "teamMembers",
                    attributes: ["name", "role", "avatar"],
                    limit: 3,
                },
            ],
            limit: 6,
            order: [["createdAt", "DESC"]],
        }),
        db_1.models.icoTokenOffering.findAll({
            where: { status: "UPCOMING" },
            include: [
                {
                    model: db_1.models.icoTokenDetail,
                    as: "tokenDetail",
                    attributes: ["description", "blockchain", "tokenType"],
                },
            ],
            limit: 4,
            order: [["startDate", "ASC"]],
        }),
        db_1.models.icoTokenOffering.findAll({
            where: { status: "SUCCESS" },
            include: [
                {
                    model: db_1.models.icoTokenDetail,
                    as: "tokenDetail",
                    attributes: ["blockchain"],
                },
            ],
            limit: 4,
            order: [["updatedAt", "DESC"]],
        }),
        db_1.models.icoTokenDetail.findAll({
            attributes: ["blockchain", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("offeringId")), "count"]],
            group: ["blockchain"],
            raw: true,
        }),
        db_1.models.icoTokenDetail.findAll({
            attributes: ["tokenType", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("offeringId")), "count"]],
            group: ["tokenType"],
            raw: true,
        }),
        db_1.models.icoLaunchPlan.findAll({
            where: { status: true },
            attributes: ["id", "name", "price", "features", "recommended"],
            order: [["price", "ASC"]],
            limit: 4,
        }),
    ]);
    const statusMap = {};
    statusCounts.forEach((s) => {
        statusMap[s.status] = parseInt(s.count) || 0;
    });
    const totalRaised = parseFloat(transactionStats === null || transactionStats === void 0 ? void 0 : transactionStats.totalRaised) || 0;
    const currentRaised = parseFloat(transactionStats === null || transactionStats === void 0 ? void 0 : transactionStats.currentRaised) || 0;
    const previousRaised = parseFloat(transactionStats === null || transactionStats === void 0 ? void 0 : transactionStats.previousRaised) || 0;
    const totalInvestors = parseInt(transactionStats === null || transactionStats === void 0 ? void 0 : transactionStats.totalInvestors) || 0;
    const currentInvestors = parseInt(transactionStats === null || transactionStats === void 0 ? void 0 : transactionStats.currentInvestors) || 0;
    const previousInvestors = parseInt(transactionStats === null || transactionStats === void 0 ? void 0 : transactionStats.previousInvestors) || 0;
    const totalOfferings = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const successfulCount = statusMap["SUCCESS"] || 0;
    const failedCount = statusMap["FAILED"] || 0;
    const completedCount = successfulCount + failedCount;
    const successRate = completedCount > 0
        ? Math.round((successfulCount / completedCount) * 100)
        : 0;
    const raisedGrowth = previousRaised > 0
        ? Math.round(((currentRaised - previousRaised) / previousRaised) * 100)
        : 0;
    const investorsGrowth = previousInvestors > 0
        ? Math.round(((currentInvestors - previousInvestors) / previousInvestors) * 100)
        : 0;
    const featuredIds = featuredOfferings.map((o) => o.id);
    const featuredRaised = featuredIds.length > 0
        ? await db_1.models.icoTransaction.findAll({
            attributes: [
                "offeringId",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("price * amount")), "raised"],
            ],
            where: {
                offeringId: { [sequelize_1.Op.in]: featuredIds },
                status: { [sequelize_1.Op.ne]: "REJECTED" },
            },
            group: ["offeringId"],
            raw: true,
        })
        : [];
    const featuredRaisedMap = {};
    featuredRaised.forEach((r) => {
        featuredRaisedMap[r.offeringId] = parseFloat(r.raised) || 0;
    });
    const successIds = successfulOfferings.map((o) => o.id);
    const successRaised = successIds.length > 0
        ? await db_1.models.icoTransaction.findAll({
            attributes: [
                "offeringId",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("price * amount")), "raised"],
            ],
            where: {
                offeringId: { [sequelize_1.Op.in]: successIds },
                status: { [sequelize_1.Op.ne]: "REJECTED" },
            },
            group: ["offeringId"],
            raw: true,
        })
        : [];
    const successRaisedMap = {};
    successRaised.forEach((r) => {
        successRaisedMap[r.offeringId] = parseFloat(r.raised) || 0;
    });
    const transformedFeatured = featuredOfferings.map((offering) => {
        var _a, _b, _c, _d, _e;
        const phases = offering.phases || [];
        const startDate = new Date(offering.startDate);
        const endDate = new Date(offering.endDate);
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        let currentPhase = null;
        let nextPhase = null;
        let cumulativeDays = 0;
        const daysSinceStart = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const phaseTimeInfo = {};
        for (let i = 0; i < phases.length; i++) {
            cumulativeDays += phases[i].duration;
            phaseTimeInfo[phases[i].id] = {
                endsIn: Math.max(0, Math.ceil(cumulativeDays - daysSinceStart)),
            };
        }
        for (let i = 0; i < phases.length; i++) {
            if (phases[i].remaining > 0) {
                currentPhase = {
                    name: phases[i].name,
                    tokenPrice: phases[i].tokenPrice,
                    remaining: phases[i].remaining,
                    endsIn: ((_a = phaseTimeInfo[phases[i].id]) === null || _a === void 0 ? void 0 : _a.endsIn) || 0,
                };
                if (i + 1 < phases.length) {
                    nextPhase = {
                        name: phases[i + 1].name,
                        tokenPrice: phases[i + 1].tokenPrice,
                        startsIn: ((_b = phaseTimeInfo[phases[i].id]) === null || _b === void 0 ? void 0 : _b.endsIn) || 0,
                    };
                }
                break;
            }
        }
        const raised = featuredRaisedMap[offering.id] || 0;
        const progress = offering.targetAmount > 0
            ? Math.min(Math.round((raised / offering.targetAmount) * 100), 100)
            : 0;
        return {
            id: offering.id,
            name: offering.name,
            symbol: offering.symbol,
            icon: offering.icon,
            description: ((_c = offering.tokenDetail) === null || _c === void 0 ? void 0 : _c.description) || "",
            status: offering.status,
            targetAmount: offering.targetAmount,
            currentRaised: raised,
            progress,
            participants: offering.participants,
            currency: offering.purchaseWalletCurrency,
            startDate: offering.startDate,
            endDate: offering.endDate,
            daysRemaining,
            currentPhase,
            nextPhase,
            teamPreview: (offering.teamMembers || []).map((tm) => ({
                name: tm.name,
                role: tm.role,
                avatar: tm.avatar,
            })),
            blockchain: ((_d = offering.tokenDetail) === null || _d === void 0 ? void 0 : _d.blockchain) || "Unknown",
            tokenType: ((_e = offering.tokenDetail) === null || _e === void 0 ? void 0 : _e.tokenType) || "Unknown",
        };
    });
    const transformedUpcoming = upcomingOfferings.map((offering) => {
        var _a, _b, _c;
        const startDate = new Date(offering.startDate);
        const daysUntilStart = Math.max(0, Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return {
            id: offering.id,
            name: offering.name,
            symbol: offering.symbol,
            icon: offering.icon,
            description: ((_a = offering.tokenDetail) === null || _a === void 0 ? void 0 : _a.description) || "",
            targetAmount: offering.targetAmount,
            startDate: offering.startDate,
            daysUntilStart,
            blockchain: ((_b = offering.tokenDetail) === null || _b === void 0 ? void 0 : _b.blockchain) || "Unknown",
            tokenType: ((_c = offering.tokenDetail) === null || _c === void 0 ? void 0 : _c.tokenType) || "Unknown",
        };
    });
    const transformedSuccess = successfulOfferings.map((offering) => {
        var _a;
        const raised = successRaisedMap[offering.id] || 0;
        const fundedPercentage = offering.targetAmount > 0
            ? Math.round((raised / offering.targetAmount) * 100)
            : 0;
        const startDate = new Date(offering.startDate);
        const completedAt = new Date(offering.updatedAt);
        const daysToComplete = Math.ceil((completedAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
            id: offering.id,
            name: offering.name,
            symbol: offering.symbol,
            icon: offering.icon,
            targetAmount: offering.targetAmount,
            totalRaised: raised,
            fundedPercentage,
            participants: offering.participants,
            completedAt: offering.updatedAt,
            daysToComplete,
            blockchain: ((_a = offering.tokenDetail) === null || _a === void 0 ? void 0 : _a.blockchain) || "Unknown",
        };
    });
    const blockchains = blockchainCounts
        .map((b) => ({
        name: b.blockchain,
        value: b.blockchain,
        offeringCount: parseInt(b.count) || 0,
    }))
        .filter((b) => b.name);
    const tokenTypes = tokenTypeCounts
        .map((t) => ({
        name: t.tokenType,
        value: t.tokenType,
        offeringCount: parseInt(t.count) || 0,
    }))
        .filter((t) => t.name);
    const transformedPlans = launchPlans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        features: Array.isArray(plan.features) ? plan.features.slice(0, 5) : [],
        popular: plan.recommended || false,
    }));
    return {
        stats: {
            totalOfferings,
            activeOfferings: statusMap["ACTIVE"] || 0,
            successfulOfferings: successfulCount,
            successRate,
            totalRaised,
            totalInvestors,
            uniqueProjects: totalOfferings,
            raisedGrowth,
            investorsGrowth,
            offeringsGrowth: 0,
            averageFundingPercentage: 0,
            averageTimeToTarget: 0,
        },
        featured: transformedFeatured,
        upcoming: transformedUpcoming,
        successStories: transformedSuccess,
        diversity: {
            blockchains,
            tokenTypes,
        },
        launchPlans: transformedPlans,
    };
};
