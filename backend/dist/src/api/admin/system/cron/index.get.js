"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const cron_1 = __importDefault(require("@b/cron"));
exports.metadata = {
    summary: "Run the cron job",
    operationId: "runCron",
    tags: ["Admin", "Cron"],
    description: "Runs the cron job to process pending tasks.",
    responses: {
        200: {
            description: "Cron job run successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Error running cron job",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Error message",
                            },
                        },
                    },
                },
            },
        },
    },
    permission: "view.cron",
    logModule: "ADMIN_SYSTEM",
    logTitle: "Get Cron Jobs",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching cron jobs");
    const cronJobManager = await cron_1.default.getInstance();
    const cronJobs = await cronJobManager.getCronJobs();
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Cron jobs retrieved successfully");
    return cronJobs;
};
