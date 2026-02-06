"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const cron_1 = __importDefault(require("@b/cron"));
exports.metadata = {
    summary: "Manually trigger a cron job",
    operationId: "triggerCronJob",
    tags: ["Admin", "Cron"],
    description: "Manually triggers execution of a specific cron job for testing purposes.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        cronName: {
                            type: "string",
                            description: "The name of the cron job to trigger",
                        },
                    },
                    required: ["cronName"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Cron job triggered successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            success: {
                                type: "boolean",
                                description: "Whether the job was triggered successfully",
                            },
                            message: {
                                type: "string",
                                description: "Success or error message",
                            },
                            cronName: {
                                type: "string",
                                description: "The name of the triggered cron job",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Bad Request - Invalid cron job name or job is already running",
        },
        404: {
            description: "Cron job not found",
        },
        500: {
            description: "Internal server error during job execution",
        },
    },
    permission: "manage.cron",
    logModule: "ADMIN_SYS",
    logTitle: "Trigger cron job",
};
exports.default = async (data) => {
    const { cronName } = data.body;
    const { ctx } = data;
    if (!cronName || typeof cronName !== "string") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "cronName is required and must be a string",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating cron job request");
        const cronJobManager = await cron_1.default.getInstance();
        const cronJobs = cronJobManager.getCronJobs();
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking if cron job '${cronName}' exists`);
        const job = cronJobs.find((job) => job.name === cronName);
        if (!job) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cron job '${cronName}' not found`);
            throw (0, error_1.createError)({
                statusCode: 404,
                message: `Cron job '${cronName}' not found`,
            });
        }
        if (job.status === "running") {
            ctx === null || ctx === void 0 ? void 0 : ctx.warn(`Cron job '${cronName}' is already running`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cron job '${cronName}' is already running`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Triggering cron job '${cronName}'`);
        const success = await cronJobManager.triggerJob(cronName);
        if (success) {
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`Cron job '${cronName}' triggered successfully`);
            return {
                success: true,
                message: `Cron job '${cronName}' triggered successfully`,
                cronName,
            };
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to trigger cron job '${cronName}'`);
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Failed to trigger cron job '${cronName}'`,
            });
        }
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Error triggering cron job: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Error triggering cron job: ${error.message}`,
        });
    }
};
