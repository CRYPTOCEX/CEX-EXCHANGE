"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get User Portfolio Overview",
    description: "Retrieves a summary of the user's ICO portfolio including total invested, pending investment, pending verification investment, received investment, rejected investment, current portfolio value, total profit/loss, and ROI. Pending investments indicate funds invested for tokens not yet received, and rejected investments indicate funds that were refunded.",
    operationId: "getUserPortfolioOverview",
    tags: ["ICO", "Portfolio"],
    logModule: "ICO",
    logTitle: "Get ICO Portfolio",
    requiresAuth: true,
    responses: {
        200: {
            description: "User portfolio overview retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalInvested: { type: "number" },
                            pendingInvested: { type: "number" },
                            pendingVerificationInvested: { type: "number" },
                            receivedInvested: { type: "number" },
                            rejectedInvested: { type: "number" },
                            currentValue: { type: "number" },
                            totalProfitLoss: { type: "number" },
                            roi: { type: "number" },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching ICO portfolio");
    try {
        const allTransactions = await db_1.models.icoTransaction.findAll({
            where: { userId: user.id },
            include: [
                {
                    model: db_1.models.icoTokenOffering,
                    as: "offering",
                    attributes: ["currentPrice", "tokenPrice"],
                },
            ],
        });
        let totalInvested = 0;
        let pendingInvested = 0;
        let pendingVerificationInvested = 0;
        let receivedInvested = 0;
        let rejectedInvested = 0;
        let currentValue = 0;
        for (const tx of allTransactions) {
            const invested = tx.amount * tx.price;
            switch (tx.status) {
                case "PENDING":
                    totalInvested += invested;
                    pendingInvested += invested;
                    break;
                case "VERIFICATION":
                    totalInvested += invested;
                    pendingVerificationInvested += invested;
                    break;
                case "RELEASED": {
                    totalInvested += invested;
                    receivedInvested += invested;
                    const offering = tx.offering;
                    const currentTokenPrice = (offering === null || offering === void 0 ? void 0 : offering.currentPrice) != null
                        ? offering.currentPrice
                        : offering === null || offering === void 0 ? void 0 : offering.tokenPrice;
                    currentValue += currentTokenPrice
                        ? tx.amount * currentTokenPrice
                        : invested;
                    break;
                }
                case "REJECTED":
                    rejectedInvested += invested;
                    break;
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("ICO portfolio retrieved successfully");
        return {
            totalInvested,
            pendingInvested,
            pendingVerificationInvested,
            receivedInvested,
            rejectedInvested,
            currentValue,
        };
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};
