"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
exports.metadata = {
    summary: "Retrieves the currently active (enabled) exchange provider",
    operationId: "getActiveExchange",
    tags: ["Admin", "Exchanges"],
    responses: {
        200: {
            description: "Active exchange details or no active provider message",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            exchange: utils_1.baseExchangeSchema,
                            result: {
                                type: "object",
                                properties: {
                                    status: { type: "boolean" },
                                    message: { type: "string" },
                                },
                            },
                            noActiveProvider: { type: "boolean" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    permission: "view.exchange",
    requiresAuth: true,
};
exports.default = async (data) => {
    const { ctx } = data;
    const exchange = await db_1.models.exchange.findOne({
        where: { status: true },
    });
    if (!exchange) {
        return {
            noActiveProvider: true,
            exchange: null,
            result: null,
        };
    }
    if (exchange.productId) {
        const cwd = process.cwd();
        const rootPath = cwd.endsWith("backend") ||
            cwd.endsWith("backend/") ||
            cwd.endsWith("backend\\")
            ? path_1.default.dirname(cwd)
            : cwd;
        const licFilePath = path_1.default.join(rootPath, "lic", `${exchange.productId}.lic`);
        let hasLicenseFile = false;
        try {
            await fs_1.promises.access(licFilePath);
            hasLicenseFile = true;
        }
        catch (_a) { }
        if (hasLicenseFile !== exchange.licenseStatus) {
            await db_1.models.exchange.update({ licenseStatus: hasLicenseFile }, { where: { id: exchange.id } });
            exchange.licenseStatus = hasLicenseFile;
        }
    }
    const result = await exchange_1.default.testExchangeCredentials(exchange.name, ctx);
    return {
        exchange,
        result,
        noActiveProvider: false,
    };
};
