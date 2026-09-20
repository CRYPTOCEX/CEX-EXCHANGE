"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordUserActivity = recordUserActivity;
const address_parser_1 = require("@b/handler/utils/address-parser");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
function pickIp(req) {
    if (!req)
        return null;
    const resolved = (0, address_parser_1.requestClientIp)(req);
    return resolved && resolved !== "unknown" ? resolved : null;
}
function pickUserAgent(req) {
    var _a;
    if (!req)
        return null;
    const ua = (_a = req.headers) === null || _a === void 0 ? void 0 : _a["user-agent"];
    if (typeof ua === "string")
        return ua.slice(0, 512);
    if (Array.isArray(ua) && typeof ua[0] === "string")
        return ua[0].slice(0, 512);
    return null;
}
async function recordUserActivity(input) {
    if (!input.userId || !input.type || !input.title)
        return;
    try {
        await db_1.models.userActivity.create({
            userId: input.userId,
            type: input.type,
            title: input.title.slice(0, 191),
            description: input.description ? input.description.slice(0, 512) : null,
            severity: input.severity || "info",
            ip: pickIp(input.req),
            userAgent: pickUserAgent(input.req),
            metadata: input.metadata || null,
        });
    }
    catch (err) {
        console_1.logger.error("USER_ACTIVITY", `Failed to record activity (${input.type}) for user ${input.userId}`, err);
    }
}
