"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Import Binary Markets from Exchange Markets",
    operationId: "importBinaryMarkets",
    tags: ["Admin", "Binary", "Markets"],
    description: "Imports spot markets from exchange markets and creates binary markets for trading.",
    requiresAuth: true,
    responses: {
        200: {
            description: "Binary markets imported successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            imported: { type: "number" },
                            skipped: { type: "number" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Exchange Markets"),
        500: query_1.serverErrorResponse,
    },
    permission: "create.binary.market",
};
exports.default = async (data) => {
    try {
        const exchangeMarkets = await db_1.models.exchangeMarket.findAll({
            where: {
                status: true,
            },
            attributes: ["currency", "pair"],
        });
        if (exchangeMarkets.length === 0) {
            throw (0, error_1.createError)({ statusCode: 404, message: "No active exchange markets found to import" });
        }
        const existingBinaryMarkets = await db_1.models.binaryMarket.findAll({
            attributes: ["currency", "pair"],
        });
        const existingPairs = new Set(existingBinaryMarkets.map((m) => `${m.currency}/${m.pair}`));
        const marketsToImport = exchangeMarkets.filter((market) => !existingPairs.has(`${market.currency}/${market.pair}`));
        let imported = 0;
        const skipped = exchangeMarkets.length - marketsToImport.length;
        await db_1.sequelize.transaction(async (transaction) => {
            for (const market of marketsToImport) {
                await db_1.models.binaryMarket.create({
                    currency: market.currency,
                    pair: market.pair,
                    isTrending: false,
                    isHot: false,
                    status: false,
                }, { transaction });
                imported++;
            }
        });
        return {
            message: `Successfully imported ${imported} binary markets from exchange markets`,
            imported,
            skipped,
        };
    }
    catch (error) {
        console_1.logger.error("BINARY", "Error importing binary markets", error);
        throw error;
    }
};
