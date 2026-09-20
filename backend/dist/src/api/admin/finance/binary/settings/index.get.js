"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Binary Settings",
    operationId: "getBinarySettings",
    tags: ["Admin", "Binary", "Settings"],
    description: "Retrieves the current binary trading settings configuration including order types, barrier levels, durations, and risk management settings.",
    responses: {
        200: {
            description: "Binary settings retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            settings: {
                                type: "object",
                                description: "The binary trading settings configuration",
                            },
                            validation: {
                                type: "object",
                                properties: {
                                    valid: { type: "boolean" },
                                    errors: { type: "array", items: { type: "string" } },
                                    warnings: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                level: { type: "string" },
                                                category: { type: "string" },
                                                message: { type: "string" },
                                                suggestion: { type: "string" },
                                                field: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                            isDefault: {
                                type: "boolean",
                                description: "Whether these are default settings (not yet configured)",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.binary.settings",
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching binary settings from database");
    try {
        const [binarySettingsRecord, binaryStatusRecord, binaryPracticeRecord] = await Promise.all([
            db_1.models.settings.findOne({ where: { key: "binarySettings" } }),
            db_1.models.settings.findOne({ where: { key: "binaryStatus" } }),
            db_1.models.settings.findOne({ where: { key: "binaryPracticeStatus" } }),
        ]);
        let settings;
        let isDefault = false;
        if (binarySettingsRecord === null || binarySettingsRecord === void 0 ? void 0 : binarySettingsRecord.value) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing stored settings");
            try {
                const parsed = JSON.parse(binarySettingsRecord.value);
                settings = (0, utils_1.mergeWithDefaults)(parsed);
            }
            catch (parseError) {
                console.error("Failed to parse binary settings:", parseError);
                settings = utils_1.DEFAULT_BINARY_SETTINGS;
                isDefault = true;
            }
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Using default settings");
            settings = utils_1.DEFAULT_BINARY_SETTINGS;
            isDefault = true;
        }
        const binaryStatus = (binaryStatusRecord === null || binaryStatusRecord === void 0 ? void 0 : binaryStatusRecord.value) !== "false" && ((binaryStatusRecord === null || binaryStatusRecord === void 0 ? void 0 : binaryStatusRecord.value) === "true" || !binaryStatusRecord);
        const binaryPracticeStatus = (binaryPracticeRecord === null || binaryPracticeRecord === void 0 ? void 0 : binaryPracticeRecord.value) !== "false" && ((binaryPracticeRecord === null || binaryPracticeRecord === void 0 ? void 0 : binaryPracticeRecord.value) === "true" || !binaryPracticeRecord);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating settings configuration");
        const validation = (0, utils_1.validateBinarySettings)(settings);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Binary settings retrieved successfully");
        return {
            settings,
            binaryStatus,
            binaryPracticeStatus,
            validation,
            isDefault,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to fetch binary settings");
        throw error;
    }
};
