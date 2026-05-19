"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get ICO Offering by ID (Creator)",
    description: "Retrieves detailed ICO offering data (including phases, token detail, team members, roadmap items, launch plan, computed stats, investor count, and rejected funds) for the authenticated creator.",
    operationId: "getCreatorIcoOfferingById",
    tags: ["ICO", "Creator", "Offerings"],
    logModule: "ICO",
    logTitle: "Get Creator Token",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ICO offering ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "ICO offering retrieved successfully." },
        401: { description: "Unauthorized" },
        404: { description: "Offering not found" },
        500: { description: "Internal Server Error" },
    },
};
function computeTimeline(offering) {
    const timeline = [];
    if (offering.createdAt) {
        timeline.push({
            id: "created",
            title: "Created",
            date: offering.createdAt,
        });
    }
    if (offering.startDate && offering.status === "ACTIVE") {
        timeline.push({
            id: "launched",
            title: "Launched",
            date: offering.startDate,
        });
    }
    if (offering.endDate) {
        timeline.push({
            id: "completed",
            title: "Completed",
            date: offering.endDate,
        });
    }
    return timeline;
}
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching creator token");
    const { id } = params;
    if (!id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No offering ID provided" });
    }
    const offering = await db_1.models.icoTokenOffering.findOne({
        where: { id, userId: user.id },
        include: [
            { model: db_1.models.icoTokenOfferingPhase, as: "phases" },
            {
                model: db_1.models.icoTokenDetail,
                as: "tokenDetail",
                include: [{ model: db_1.models.icoTokenType, as: "tokenTypeData" }]
            },
            { model: db_1.models.icoLaunchPlan, as: "plan" },
        ],
    });
    if (!offering) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Offering not found" });
    }
    const now = new Date();
    const phases = offering.phases || [];
    let cumulativeDays = 0;
    let currentPhase = null;
    let nextPhase = null;
    const startDate = new Date(offering.startDate);
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i < phases.length; i++) {
        cumulativeDays += phases[i].duration;
        if (daysSinceStart < cumulativeDays) {
            const phaseEndsIn = cumulativeDays - daysSinceStart;
            currentPhase = { ...phases[i].toJSON(), endsIn: phaseEndsIn };
            if (i + 1 < phases.length) {
                nextPhase = {
                    ...phases[i + 1].toJSON(),
                    endsIn: phases[i + 1].duration,
                };
            }
            break;
        }
    }
    const validTxResult = await db_1.models.icoTransaction.findOne({
        attributes: [
            [
                (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("amount * price")), 0),
                "validFundsRaised",
            ],
        ],
        where: {
            offeringId: offering.id,
            status: { [sequelize_1.Op.not]: ["REJECTED"] },
        },
        raw: true,
    });
    const fundsRaised = parseFloat((_b = (_a = validTxResult === null || validTxResult === void 0 ? void 0 : validTxResult.validFundsRaised) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "0") || 0;
    const rejectedTxResult = await db_1.models.icoTransaction.findOne({
        attributes: [
            [
                (0, sequelize_1.fn)("COALESCE", (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("amount * price")), 0),
                "rejectedFunds",
            ],
        ],
        where: {
            offeringId: offering.id,
            status: "REJECTED",
        },
        raw: true,
    });
    const rejectedFunds = parseFloat((_d = (_c = rejectedTxResult === null || rejectedTxResult === void 0 ? void 0 : rejectedTxResult.rejectedFunds) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : "0") || 0;
    const investorTransactions = await db_1.models.icoTransaction.findAll({
        attributes: ["userId"],
        where: {
            offeringId: offering.id,
            status: { [sequelize_1.Op.in]: ["PENDING", "RELEASED"] },
        },
        group: ["userId"],
        raw: true,
    });
    const investorsCount = investorTransactions.length;
    const fundingGoal = offering.targetAmount;
    const launchDate = offering.status === "ACTIVE" && offering.startDate
        ? offering.startDate
        : null;
    const timeline = computeTimeline(offering);
    const transformedOffering = {
        id: offering.id,
        name: offering.name,
        symbol: offering.symbol,
        icon: offering.icon,
        purchaseWalletCurrency: offering.purchaseWalletCurrency,
        purchaseWalletType: offering.purchaseWalletType,
        status: offering.status,
        tokenPrice: offering.tokenPrice,
        targetAmount: offering.targetAmount,
        participants: offering.participants,
        isPaused: offering.isPaused,
        isFlagged: offering.isFlagged,
        startDate: offering.startDate,
        endDate: offering.endDate,
        currentPhase,
        nextPhase,
        phases: phases.map((phase) => phase.toJSON()),
        tokenDetail: offering.tokenDetail ? offering.tokenDetail.toJSON() : null,
        plan: offering.plan ? offering.plan.toJSON() : null,
        fundsRaised,
        rejectedFunds,
        fundingGoal,
        launchDate,
        timeline,
        investorsCount,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Creator token retrieved successfully");
    return transformedOffering;
};
