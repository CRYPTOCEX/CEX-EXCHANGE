"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = getPopularIcoOfferings;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Popular ICO Offerings",
    description: "Returns the most popular ICO token offerings (by total raised).",
    operationId: "getPopularIcoOfferings",
    tags: ["ICO", "Offerings"],
    logModule: "ICO",
    logTitle: "Get Featured ICO Offers",
    responses: {
        200: {
            description: "Popular ICO offerings retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            projects: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        name: { type: "string" },
                                        image: { type: "string" },
                                        description: { type: "string" },
                                        raised: { type: "string" },
                                        target: { type: "string" },
                                        progress: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        500: { description: "Internal Server Error." },
    },
};
async function getPopularIcoOfferings(data) {
    try {
        const { ctx } = data || {};
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching get featured ico offers");
        const offerings = await db_1.models.icoTokenOffering.findAll({
            attributes: [
                "id",
                "name",
                "targetAmount",
                "purchaseWalletCurrency",
                "icon",
            ],
            include: [
                {
                    model: db_1.models.icoTokenDetail,
                    as: "tokenDetail",
                    attributes: ["description"],
                },
            ],
            limit: 12,
            raw: false,
        });
        if (!offerings || offerings.length === 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Featured ICO Offers retrieved successfully");
            return { projects: [] };
        }
        const ids = offerings.map((o) => o.id);
        const raisedList = await db_1.models.icoTransaction.findAll({
            attributes: [
                "offeringId",
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("price * amount")), "raised"],
            ],
            where: {
                offeringId: { [sequelize_1.Op.in]: ids },
                status: { [sequelize_1.Op.ne]: "REJECTED" },
            },
            group: ["offeringId"],
            raw: true,
        });
        const raisedMap = {};
        for (const row of raisedList) {
            raisedMap[row.offeringId] = Number(row.raised) || 0;
        }
        const projects = offerings
            .map((o) => {
            var _a;
            const raised = raisedMap[o.id] || 0;
            const target = Number(o.targetAmount) || 1;
            const currency = o.purchaseWalletCurrency || "$";
            return {
                id: o.id,
                name: o.name,
                image: o.icon || "/img/placeholder.svg",
                description: ((_a = o.tokenDetail) === null || _a === void 0 ? void 0 : _a.description) || "",
                raised: `${raised.toLocaleString()} ${currency}`,
                target: `${target.toLocaleString()} ${currency}`,
                progress: Math.min(Math.round((raised / target) * 100), 100),
            };
        })
            .sort((a, b) => parseFloat(b.raised.replace(/[^\d.]/g, "")) -
            parseFloat(a.raised.replace(/[^\d.]/g, "")))
            .slice(0, 6);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Featured ICO Offers retrieved successfully");
        return { projects };
    }
    catch (error) {
        console.error("Error in getPopularIcoOfferings:", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
}
