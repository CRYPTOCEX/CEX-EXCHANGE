"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const visibility_1 = require("@b/api/(ext)/p2p/utils/visibility");
exports.metadata = {
    summary: "Get P2P Market Highlights",
    description: "Retrieves highlighted market data (for example, top active offers).",
    operationId: "getP2PMarketHighlights",
    tags: ["P2P", "Market"],
    logModule: "P2P",
    logTitle: "Get market highlights",
    responses: {
        200: { description: "P2P market highlights retrieved successfully." },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching market highlights");
    try {
        const highlights = await db_1.models.p2pOffer.findAll({
            where: {
                status: "ACTIVE",
                [sequelize_1.Op.and]: [(0, visibility_1.publicVisibilityLiteral)()],
            },
            order: [["createdAt", "DESC"]],
            limit: 5,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${highlights.length} market highlights`);
        return highlights;
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve market highlights");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
