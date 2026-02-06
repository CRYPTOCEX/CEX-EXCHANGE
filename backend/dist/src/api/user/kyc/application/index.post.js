"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const redis_1 = require("@b/utils/redis");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Submit a KYC Application",
    description: "Submits a new KYC application for the authenticated user. Expects a JSON payload " +
        "with a valid levelId and a 'fields' object containing key/value pairs for each field as defined " +
        "in the KYC level configuration.",
    operationId: "submitKycApplication",
    tags: ["KYC", "Application"],
    requiresAuth: true,
    logModule: "KYC",
    logTitle: "Submit KYC application",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        levelId: {
                            type: "string",
                            description: "ID of the KYC level for this application",
                        },
                        fields: {
                            type: "object",
                            description: "An object where keys are field IDs and values are the submitted data",
                        },
                    },
                    required: ["levelId", "fields"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "KYC application submitted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            application: { type: "object" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("KYC Level"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!user) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Authentication required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating request parameters");
    const { levelId, fields } = body;
    if (!levelId || !fields || typeof fields !== "object") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid request parameters");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing or invalid required fields: levelId and fields",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking rate limits");
    await checkRateLimit(user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing KYC applications");
    const existingApplication = await db_1.models.kycApplication.findOne({
        where: {
            userId: user.id,
            levelId,
            status: {
                [sequelize_1.Op.in]: ["PENDING", "APPROVED", "ADDITIONAL_INFO_REQUIRED"],
            },
        },
    });
    if (existingApplication) {
        const statusMessages = {
            PENDING: "You already have a pending application for this KYC level. Please wait for review.",
            APPROVED: "You already have an approved application for this KYC level.",
            ADDITIONAL_INFO_REQUIRED: "You have an existing application requiring additional information. Please update it instead of creating a new one."
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Duplicate application detected with status: ${existingApplication.status}`);
        throw (0, error_1.createError)({
            statusCode: 409,
            message: statusMessages[existingApplication.status] || "You already have an application for this KYC level.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking rejection cooldown period");
    await checkRejectionCooldown(user.id, levelId);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving KYC level configuration");
    const levelRecord = await db_1.models.kycLevel.findByPk(levelId);
    if (!levelRecord) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("KYC level not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "KYC level not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating KYC level status");
    if (levelRecord.status !== "ACTIVE") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("KYC level is not active");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "This KYC level is not currently available for applications",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user has completed prerequisite levels");
    const targetLevelNumber = levelRecord.level;
    if (targetLevelNumber > 1) {
        const previousLevels = await db_1.models.kycLevel.findAll({
            where: {
                level: { [sequelize_1.Op.lt]: targetLevelNumber },
                status: "ACTIVE",
            },
            attributes: ["id", "level", "fields"],
        });
        const configuredPreviousLevels = previousLevels.filter((level) => {
            let fields = level.fields;
            if (typeof fields === "string") {
                try {
                    fields = JSON.parse(fields);
                }
                catch (_a) {
                    return false;
                }
            }
            return Array.isArray(fields) && fields.length > 0;
        });
        for (const prevLevel of configuredPreviousLevels) {
            const approvedApp = await db_1.models.kycApplication.findOne({
                where: {
                    userId: user.id,
                    levelId: prevLevel.id,
                    status: "APPROVED",
                },
            });
            if (!approvedApp) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail(`User has not completed Level ${prevLevel.level}`);
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: `You must complete Level ${prevLevel.level} verification before applying for Level ${targetLevelNumber}`,
                });
            }
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing KYC level field configuration");
    let levelFields = levelRecord.fields;
    if (typeof levelFields === "string") {
        try {
            levelFields = JSON.parse(levelFields);
        }
        catch (err) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to parse KYC level configuration");
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Invalid KYC level configuration: unable to parse fields",
            });
        }
    }
    if (!Array.isArray(levelFields)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid KYC level configuration format");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Invalid KYC level configuration",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Validating ${levelFields.length} submitted fields`);
    for (const fieldDef of levelFields) {
        const submittedValue = fields[fieldDef.id];
        const error = (0, utils_1.validateKycField)(fieldDef, submittedValue);
        if (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Field validation failed for: ${fieldDef.id}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Validation error for field "${fieldDef.id}": ${error}`,
            });
        }
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating KYC application record");
        const newApplication = await db_1.models.kycApplication.create({
            userId: user.id,
            levelId,
            data: fields,
            status: "PENDING",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating rate limit counter");
        await updateRateLimit(user.id);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("KYC application submitted successfully");
        return {
            message: "KYC application submitted successfully.",
            application: newApplication,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to create application: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message || "Internal Server Error.",
        });
    }
};
async function checkRateLimit(userId) {
    try {
        const redis = redis_1.RedisSingleton.getInstance();
        const key = `kyc_rate_limit:${userId}`;
        const submissions = await redis.get(key);
        const maxSubmissions = 3;
        const windowMinutes = 60;
        if (submissions && parseInt(submissions) >= maxSubmissions) {
            throw (0, error_1.createError)({
                statusCode: 429,
                message: `Too many KYC application attempts. Please wait ${windowMinutes} minutes before trying again.`,
            });
        }
    }
    catch (error) {
        if (error.statusCode === 429) {
            throw error;
        }
        console_1.logger.error("KYC", "Rate limiting check failed", error);
    }
}
async function updateRateLimit(userId) {
    try {
        const redis = redis_1.RedisSingleton.getInstance();
        const key = `kyc_rate_limit:${userId}`;
        const windowMinutes = 60;
        const current = await redis.get(key);
        if (current) {
            await redis.incr(key);
        }
        else {
            await redis.setex(key, windowMinutes * 60, 1);
        }
    }
    catch (error) {
        console_1.logger.error("KYC", "Rate limiting update failed", error);
    }
}
async function checkRejectionCooldown(userId, levelId) {
    var _a;
    const cooldownHours = 24;
    const cutoffTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
    const recentRejection = await db_1.models.kycApplication.findOne({
        where: {
            userId,
            levelId,
            status: "REJECTED",
            updatedAt: {
                [sequelize_1.Op.gte]: cutoffTime,
            },
        },
        order: [["updatedAt", "DESC"]],
    });
    if (recentRejection) {
        const updatedAt = (_a = recentRejection.updatedAt) !== null && _a !== void 0 ? _a : new Date();
        const hoursLeft = Math.ceil((updatedAt.getTime() + cooldownHours * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000));
        throw (0, error_1.createError)({
            statusCode: 429,
            message: `You must wait ${hoursLeft} more hours before resubmitting after a rejection.`,
        });
    }
}
