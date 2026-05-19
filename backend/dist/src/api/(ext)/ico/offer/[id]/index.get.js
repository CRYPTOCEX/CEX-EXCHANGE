"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get ICO Offering by ID",
    description: "Retrieves detailed ICO token offering data by its unique identifier. The response includes related phases, token details, team members, and roadmap items. Additionally, it calculates the current and next phases based on the offering's start date and the durations of its phases.",
    operationId: "getIcoOfferingById",
    tags: ["ICO", "Offerings"],
    logModule: "ICO",
    logTitle: "Get ICO Offer",
    parameters: [
        {
            name: "id",
            in: "path",
            description: "Unique identifier of the ICO offering",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "ICO offering retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            id: {
                                type: "string",
                                description: "Unique identifier for the offering",
                            },
                            name: { type: "string", description: "Name of the offering" },
                            symbol: { type: "string", description: "Token ticker" },
                            icon: { type: "string", description: "Offering icon URL" },
                            purchaseWalletCurrency: {
                                type: "string",
                                description: "Wallet currency for purchase",
                            },
                            purchaseWalletType: {
                                type: "string",
                                description: "Wallet type for purchase",
                            },
                            status: {
                                type: "string",
                                description: "Current status (ACTIVE, PENDING, etc.). For COMPLETED queries, the status may be SUCCESS or FAILED.",
                            },
                            tokenPrice: {
                                type: "number",
                                description: "Current active phase token price (used for purchase calculations)",
                            },
                            baseTokenPrice: {
                                type: "number",
                                description: "Base token price from offering (for reference)",
                            },
                            targetAmount: {
                                type: "number",
                                description: "Total funding target",
                            },
                            participants: {
                                type: "number",
                                description: "Number of participants",
                            },
                            isPaused: {
                                type: "boolean",
                                description: "Flag if the offering is paused",
                            },
                            isFlagged: {
                                type: "boolean",
                                description: "Flag if the offering is flagged",
                            },
                            startDate: {
                                type: "string",
                                format: "date-time",
                                description: "Start date of the offering",
                            },
                            endDate: {
                                type: "string",
                                format: "date-time",
                                description: "End date of the offering",
                            },
                            currentPhase: {
                                type: "object",
                                description: "Information about the current phase",
                            },
                            nextPhase: {
                                type: "object",
                                description: "Information about the next phase",
                            },
                            phases: {
                                type: "array",
                                description: "List of all phases for the offering",
                                items: { type: "object" },
                            },
                            tokenDetail: {
                                type: "object",
                                description: "Detailed token information",
                            },
                            teamMembers: {
                                type: "array",
                                description: "List of team members",
                                items: { type: "object" },
                            },
                            roadmapItems: {
                                type: "array",
                                description: "List of roadmap items",
                                items: { type: "object" },
                            },
                            currentRaised: {
                                type: "number",
                                description: "Sum of all transactions (price * amount) associated with this offering",
                            },
                        },
                    },
                },
            },
        },
        404: { description: "ICO offering not found." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    var _a, _b;
    try {
        const { ctx } = data;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching get ico offer");
        const { id } = data.params || {};
        if (!id) {
            throw (0, error_1.createError)({ statusCode: 400, message: "No offering ID provided" });
        }
        const offering = await db_1.models.icoTokenOffering.findOne({
            where: { id },
            include: [
                {
                    model: db_1.models.icoTokenOfferingPhase,
                    as: "phases",
                    order: [["sequence", "ASC"]],
                },
                {
                    model: db_1.models.icoTokenDetail,
                    as: "tokenDetail",
                    include: [{ model: db_1.models.icoTokenType, as: "tokenTypeData" }]
                },
                { model: db_1.models.icoTeamMember, as: "teamMembers" },
                { model: db_1.models.icoRoadmapItem, as: "roadmapItems" },
            ],
        });
        if (!offering) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Get ICO Offer retrieved successfully");
            return { error: "Offering not found" };
        }
        const currentRaisedPromise = db_1.models.icoTransaction.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("price * amount")), "currentRaised"]],
            where: {
                offeringId: id,
                status: { [sequelize_1.Op.not]: ["REJECTED"] },
            },
            raw: true,
        });
        const phases = offering.phases || [];
        const startDate = new Date(offering.startDate);
        let currentPhase = null;
        let nextPhase = null;
        let cumulativeDays = 0;
        const phaseTimeInfo = {};
        const daysSinceStart = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        for (let i = 0; i < phases.length; i++) {
            cumulativeDays += phases[i].duration;
            phaseTimeInfo[phases[i].id] = {
                endsIn: Math.max(0, Math.ceil(cumulativeDays - daysSinceStart)),
            };
        }
        for (let i = 0; i < phases.length; i++) {
            if (phases[i].remaining > 0) {
                currentPhase = {
                    ...phases[i].toJSON(),
                    endsIn: ((_a = phaseTimeInfo[phases[i].id]) === null || _a === void 0 ? void 0 : _a.endsIn) || 0,
                };
                if (i + 1 < phases.length) {
                    nextPhase = {
                        ...phases[i + 1].toJSON(),
                        endsIn: ((_b = phaseTimeInfo[phases[i + 1].id]) === null || _b === void 0 ? void 0 : _b.endsIn) || phases[i + 1].duration,
                    };
                }
                break;
            }
        }
        const currentRaisedResult = await currentRaisedPromise;
        const currentRaised = (currentRaisedResult === null || currentRaisedResult === void 0 ? void 0 : currentRaisedResult.currentRaised)
            ? Number(currentRaisedResult === null || currentRaisedResult === void 0 ? void 0 : currentRaisedResult.currentRaised)
            : 0;
        const currentTokenPrice = (currentPhase === null || currentPhase === void 0 ? void 0 : currentPhase.tokenPrice) || offering.tokenPrice;
        const transformedOffering = {
            id: offering.id,
            name: offering.name,
            symbol: offering.symbol,
            icon: offering.icon,
            purchaseWalletCurrency: offering.purchaseWalletCurrency,
            purchaseWalletType: offering.purchaseWalletType,
            status: offering.status,
            tokenPrice: currentTokenPrice,
            baseTokenPrice: offering.tokenPrice,
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
            teamMembers: offering.teamMembers
                ? offering.teamMembers.map((tm) => tm.toJSON())
                : [],
            roadmapItems: offering.roadmapItems
                ? offering.roadmapItems.map((rm) => rm.toJSON())
                : [],
            currentRaised,
        };
        return transformedOffering;
    }
    catch (error) {
        console_1.logger.error("ICO_OFFER", "Error retrieving ICO offering by ID", error);
        throw error;
    }
};
