"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Creator ICO Offerings",
    description: "Retrieves ICO offerings for the authenticated creator, grouped by status (active, pending, completed) along with currentRaised for each offering.",
    operationId: "getCreatorOfferings",
    tags: ["ICO", "Creator", "Offerings"],
    logModule: "ICO",
    logTitle: "Get Creator Tokens",
    requiresAuth: true,
    responses: {
        200: {
            description: "Creator offerings retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            active: { type: "array", items: { type: "object" } },
                            pending: { type: "array", items: { type: "object" } },
                            completed: { type: "array", items: { type: "object" } },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching creator tokens");
    const offerings = await db_1.models.icoTokenOffering.findAll({
        where: { userId: user.id },
        raw: true,
    });
    if (!offerings.length) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Creator tokens retrieved successfully");
        return { active: [], pending: [], completed: [] };
    }
    const offeringIds = offerings.map((o) => o.id);
    const currentRaisedData = await db_1.models.icoTransaction.findAll({
        attributes: [
            "offeringId",
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("price * amount")), "currentRaised"],
        ],
        where: {
            offeringId: { [sequelize_1.Op.in]: offeringIds },
            status: { [sequelize_1.Op.not]: ["REJECTED"] },
        },
        group: ["offeringId"],
        raw: true,
    });
    const raisedMap = {};
    currentRaisedData.forEach((row) => {
        var _a, _b;
        raisedMap[row.offeringId] = parseFloat((_b = (_a = row.currentRaised) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "0") || 0;
    });
    const offeringsWithRaised = offerings.map((offering) => ({
        ...offering,
        currentRaised: raisedMap[offering.id] || 0,
    }));
    const active = offeringsWithRaised.filter((o) => o.status === "ACTIVE");
    const pending = offeringsWithRaised.filter((o) => o.status === "PENDING");
    const completed = offeringsWithRaised.filter((o) => o.status === "SUCCESS");
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Creator Tokens retrieved successfully");
    return { active, pending, completed };
};
