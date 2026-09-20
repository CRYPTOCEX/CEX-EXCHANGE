"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KYC_DECISION_STATUSES = void 0;
exports.applyKycDecision = applyKycDecision;
const db_1 = require("@b/db");
const system_accounts_1 = require("@b/utils/system-accounts");
const emails_1 = require("@b/utils/emails");
const redis_1 = require("@b/utils/redis");
const user_activity_1 = require("@b/utils/user-activity");
const console_1 = require("@b/utils/console");
exports.KYC_DECISION_STATUSES = [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "ADDITIONAL_INFO_REQUIRED",
];
async function applyKycDecision({ application, status, adminNotes, decidedBy = "admin", serviceName, ctx, }) {
    var _a;
    var _b;
    (0, system_accounts_1.assertNotSystemAccount)(application === null || application === void 0 ? void 0 : application.userId, "given a KYC decision");
    const fromStatus = application.status;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating application status to ${status}`);
    application.status = status;
    if (adminNotes !== undefined)
        application.adminNotes = adminNotes;
    application.reviewedAt = new Date();
    await application.save();
    const statusChanged = status !== fromStatus;
    if (statusChanged) {
        try {
            const redis = redis_1.RedisSingleton.getInstance();
            await redis.del(`user:${application.userId}:profile`);
        }
        catch (error) {
            console_1.logger.error("KYC", "Error clearing user cache after KYC decision", error);
        }
    }
    const levelData = ((_a = application.level) === null || _a === void 0 ? void 0 : _a.level)
        ? application.level
        : await db_1.models.kycLevel.findByPk(application.levelId);
    let applicant = application.user;
    if (!applicant) {
        applicant = await db_1.models.user.findByPk(application.userId);
    }
    const emailType = status === "APPROVED"
        ? "KycApproved"
        : status === "REJECTED"
            ? "KycRejected"
            : status === "ADDITIONAL_INFO_REQUIRED"
                ? "KycUpdate"
                : null;
    if (emailType && applicant) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Sending ${emailType} email notification`);
        try {
            await (0, emails_1.sendKycEmail)(applicant, {
                ...application.get({ plain: true }),
                level: levelData ? levelData.level : "N/A",
            }, emailType, ctx);
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.warn("Failed to send KYC email notification");
            console_1.logger.error("KYC", "Error sending KYC email", error);
        }
    }
    if (statusChanged) {
        const levelLabel = (levelData === null || levelData === void 0 ? void 0 : levelData.name)
            ? `${levelData.name} (Level ${levelData.level})`
            : `Level ${(_b = levelData === null || levelData === void 0 ? void 0 : levelData.level) !== null && _b !== void 0 ? _b : "?"}`;
        const decidedSuffix = decidedBy === "service"
            ? ` — automated review${serviceName ? ` (${serviceName})` : ""}`
            : "";
        let activityType = null;
        let title = "";
        let severity = "info";
        if (status === "APPROVED") {
            activityType = "kyc.approved";
            title = "KYC approved";
            severity = "success";
        }
        else if (status === "REJECTED") {
            activityType = "kyc.rejected";
            title = "KYC rejected";
            severity = "warning";
        }
        else if (status === "ADDITIONAL_INFO_REQUIRED") {
            activityType = "kyc.updated";
            title = "KYC needs more information";
            severity = "warning";
        }
        if (activityType) {
            void (0, user_activity_1.recordUserActivity)({
                userId: application.userId,
                type: activityType,
                title,
                description: `${levelLabel}${decidedSuffix}`,
                severity,
                metadata: {
                    applicationId: application.id,
                    fromStatus,
                    toStatus: status,
                    decidedBy,
                    ...(serviceName ? { serviceName } : {}),
                },
            });
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`KYC application updated to ${status}`);
    return { fromStatus, toStatus: status };
}
