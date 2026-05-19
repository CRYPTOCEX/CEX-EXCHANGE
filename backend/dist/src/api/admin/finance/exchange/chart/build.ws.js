"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const console_1 = require("@b/utils/console");
const redis_1 = require("@b/utils/redis");
const redis = redis_1.RedisSingleton.getInstance();
exports.metadata = {
    requiresAuth: true,
    permission: "manage.exchange.chart",
    summary: "WebSocket endpoint for chart build job progress",
    description: "Subscribe to real-time progress updates for chart build jobs",
};
exports.default = async (data, message) => {
    try {
        let parsedMessage;
        if (typeof message === "string") {
            try {
                parsedMessage = JSON.parse(message);
            }
            catch (error) {
                return { type: "error", message: "Invalid JSON message" };
            }
        }
        else {
            parsedMessage = message;
        }
        if (!parsedMessage || !parsedMessage.action) {
            return { type: "error", message: "Invalid message structure" };
        }
        const { action, payload } = parsedMessage;
        switch (action) {
            case "SUBSCRIBE":
                if (payload === null || payload === void 0 ? void 0 : payload.jobId) {
                    const jobData = await redis.get(`chart_build_job:${payload.jobId}`);
                    return {
                        type: "subscription",
                        status: "success",
                        message: `Subscribed to job ${payload.jobId}`,
                        data: jobData ? JSON.parse(jobData) : { status: "pending", progress: 0 },
                    };
                }
                return { type: "error", message: "Job ID required" };
            case "UNSUBSCRIBE":
                if (payload === null || payload === void 0 ? void 0 : payload.jobId) {
                    return {
                        type: "subscription",
                        status: "success",
                        message: `Unsubscribed from job ${payload.jobId}`,
                    };
                }
                return { type: "error", message: "Job ID required" };
            case "GET_STATUS":
                if (payload === null || payload === void 0 ? void 0 : payload.jobId) {
                    const jobData = await redis.get(`chart_build_job:${payload.jobId}`);
                    if (jobData) {
                        return {
                            type: "status",
                            data: JSON.parse(jobData),
                        };
                    }
                    return {
                        type: "status",
                        data: { status: "not_found" },
                    };
                }
                return { type: "error", message: "Job ID required" };
            default:
                return { type: "error", message: `Unknown action: ${action}` };
        }
    }
    catch (error) {
        console_1.logger.error("Chart Build WS", `Error: ${error.message}`);
        return { type: "error", message: error.message };
    }
};
