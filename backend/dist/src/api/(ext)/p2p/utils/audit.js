"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.P2PRiskLevel = exports.P2PAuditEventType = void 0;
exports.createP2PAuditLog = createP2PAuditLog;
exports.createP2PAuditLogBatch = createP2PAuditLogBatch;
exports.withAuditLog = withAuditLog;
exports.getP2PAuditLogs = getP2PAuditLogs;
exports.exportP2PAuditLogs = exportP2PAuditLogs;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
var P2PAuditEventType;
(function (P2PAuditEventType) {
    P2PAuditEventType["TRADE_INITIATED"] = "TRADE_INITIATED";
    P2PAuditEventType["TRADE_PAYMENT_CONFIRMED"] = "TRADE_PAYMENT_CONFIRMED";
    P2PAuditEventType["TRADE_FUNDS_RELEASED"] = "TRADE_FUNDS_RELEASED";
    P2PAuditEventType["TRADE_CANCELLED"] = "TRADE_CANCELLED";
    P2PAuditEventType["TRADE_DISPUTED"] = "TRADE_DISPUTED";
    P2PAuditEventType["TRADE_COMPLETED"] = "TRADE_COMPLETED";
    P2PAuditEventType["TRADE_EXPIRED"] = "TRADE_EXPIRED";
    P2PAuditEventType["OFFER_CREATED"] = "OFFER_CREATED";
    P2PAuditEventType["OFFER_UPDATED"] = "OFFER_UPDATED";
    P2PAuditEventType["OFFER_DELETED"] = "OFFER_DELETED";
    P2PAuditEventType["OFFER_PAUSED"] = "OFFER_PAUSED";
    P2PAuditEventType["OFFER_ACTIVATED"] = "OFFER_ACTIVATED";
    P2PAuditEventType["FUNDS_LOCKED"] = "FUNDS_LOCKED";
    P2PAuditEventType["FUNDS_UNLOCKED"] = "FUNDS_UNLOCKED";
    P2PAuditEventType["FUNDS_TRANSFERRED"] = "FUNDS_TRANSFERRED";
    P2PAuditEventType["FEE_CHARGED"] = "FEE_CHARGED";
    P2PAuditEventType["ADMIN_TRADE_RESOLVED"] = "ADMIN_TRADE_RESOLVED";
    P2PAuditEventType["ADMIN_DISPUTE_RESOLVED"] = "ADMIN_DISPUTE_RESOLVED";
    P2PAuditEventType["ADMIN_OFFER_APPROVED"] = "ADMIN_OFFER_APPROVED";
    P2PAuditEventType["ADMIN_USER_BANNED"] = "ADMIN_USER_BANNED";
    P2PAuditEventType["SUSPICIOUS_ACTIVITY"] = "SUSPICIOUS_ACTIVITY";
    P2PAuditEventType["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    P2PAuditEventType["UNAUTHORIZED_ACCESS"] = "UNAUTHORIZED_ACCESS";
    P2PAuditEventType["VALIDATION_FAILED"] = "VALIDATION_FAILED";
})(P2PAuditEventType || (exports.P2PAuditEventType = P2PAuditEventType = {}));
var P2PRiskLevel;
(function (P2PRiskLevel) {
    P2PRiskLevel["LOW"] = "LOW";
    P2PRiskLevel["MEDIUM"] = "MEDIUM";
    P2PRiskLevel["HIGH"] = "HIGH";
    P2PRiskLevel["CRITICAL"] = "CRITICAL";
})(P2PRiskLevel || (exports.P2PRiskLevel = P2PRiskLevel = {}));
async function createP2PAuditLog(log, ctx) {
    var _a, _b, _c, _d, _e, _f;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Creating P2P audit log entry");
        const riskLevel = log.riskLevel || determineRiskLevel(log.eventType, log.metadata);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, `Determined risk level: ${riskLevel}`);
        await db_1.models.p2pActivityLog.create({
            userId: log.userId,
            type: log.eventType,
            action: log.eventType,
            relatedEntity: log.entityType,
            relatedEntityId: log.entityId,
            details: JSON.stringify({
                ...log.metadata,
                timestamp: new Date().toISOString(),
                riskLevel,
                isAdminAction: log.isAdminAction || false,
                adminId: log.adminId,
            }),
        });
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Audit log entry created");
        if (riskLevel === P2PRiskLevel.HIGH || riskLevel === P2PRiskLevel.CRITICAL) {
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Creating security alert for high-risk event");
            await createSecurityAlert(log, riskLevel, ctx);
        }
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, "P2P audit log created successfully");
    }
    catch (error) {
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, error.message || "Failed to create audit log");
        console_1.logger.error("P2P_AUDIT", "Failed to create audit log", error);
    }
}
async function createP2PAuditLogBatch(logs, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Creating batch of ${logs.length} audit log entries`);
        const auditEntries = logs.map(log => ({
            userId: log.userId,
            type: log.eventType,
            action: log.eventType,
            relatedEntity: log.entityType,
            relatedEntityId: log.entityId,
            details: JSON.stringify({
                ...log.metadata,
                timestamp: new Date().toISOString(),
                riskLevel: log.riskLevel || determineRiskLevel(log.eventType, log.metadata),
                isAdminAction: log.isAdminAction || false,
                adminId: log.adminId,
            }),
        }));
        await db_1.models.p2pActivityLog.bulkCreate(auditEntries);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Batch of ${logs.length} audit log entries created successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message || "Failed to create audit log batch");
        console_1.logger.error("P2P_AUDIT", "Failed to create audit log batch", error);
    }
}
function determineRiskLevel(eventType, metadata) {
    if ([
        P2PAuditEventType.FUNDS_TRANSFERRED,
        P2PAuditEventType.UNAUTHORIZED_ACCESS,
        P2PAuditEventType.ADMIN_USER_BANNED,
    ].includes(eventType)) {
        return P2PRiskLevel.CRITICAL;
    }
    if ([
        P2PAuditEventType.TRADE_DISPUTED,
        P2PAuditEventType.SUSPICIOUS_ACTIVITY,
        P2PAuditEventType.ADMIN_TRADE_RESOLVED,
        P2PAuditEventType.ADMIN_DISPUTE_RESOLVED,
    ].includes(eventType)) {
        return P2PRiskLevel.HIGH;
    }
    if (metadata.amount && metadata.amount > 1000) {
        return P2PRiskLevel.MEDIUM;
    }
    if ([
        P2PAuditEventType.TRADE_CANCELLED,
        P2PAuditEventType.OFFER_DELETED,
        P2PAuditEventType.RATE_LIMIT_EXCEEDED,
    ].includes(eventType)) {
        return P2PRiskLevel.MEDIUM;
    }
    return P2PRiskLevel.LOW;
}
async function createSecurityAlert(log, riskLevel, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Sending security alert to admins");
        const { notifyAdmins } = await Promise.resolve().then(() => __importStar(require("./notifications")));
        await notifyAdmins("P2P_SECURITY_ALERT", {
            eventType: log.eventType,
            entityType: log.entityType,
            entityId: log.entityId,
            userId: log.userId,
            adminId: log.adminId,
            riskLevel,
            metadata: log.metadata,
            timestamp: new Date().toISOString(),
        });
        console_1.logger.warn("P2P_SECURITY", `${riskLevel} risk event: ${log.eventType} for ${log.entityType} ${log.entityId}`);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Security alert sent successfully");
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message || "Failed to create security alert");
        console_1.logger.error("P2P_SECURITY", "Failed to create security alert", error);
    }
}
function withAuditLog(fn, eventType, entityType) {
    return (async (...args) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const startTime = Date.now();
        let result;
        let error;
        try {
            result = await fn(...args);
            const context = args[0];
            if (((_a = context === null || context === void 0 ? void 0 : context.user) === null || _a === void 0 ? void 0 : _a.id) && ((_b = context === null || context === void 0 ? void 0 : context.params) === null || _b === void 0 ? void 0 : _b.id)) {
                await createP2PAuditLog({
                    userId: context.user.id,
                    eventType,
                    entityType,
                    entityId: context.params.id,
                    metadata: {
                        success: true,
                        executionTime: Date.now() - startTime,
                        ip: context.ip || ((_c = context.connection) === null || _c === void 0 ? void 0 : _c.remoteAddress),
                        userAgent: (_d = context.headers) === null || _d === void 0 ? void 0 : _d["user-agent"],
                    },
                });
            }
            return result;
        }
        catch (err) {
            error = err;
            const context = args[0];
            if (((_e = context === null || context === void 0 ? void 0 : context.user) === null || _e === void 0 ? void 0 : _e.id) && ((_f = context === null || context === void 0 ? void 0 : context.params) === null || _f === void 0 ? void 0 : _f.id)) {
                await createP2PAuditLog({
                    userId: context.user.id,
                    eventType: P2PAuditEventType.VALIDATION_FAILED,
                    entityType,
                    entityId: context.params.id,
                    metadata: {
                        success: false,
                        error: err.message,
                        originalEvent: eventType,
                        executionTime: Date.now() - startTime,
                        ip: context.ip || ((_g = context.connection) === null || _g === void 0 ? void 0 : _g.remoteAddress),
                        userAgent: (_h = context.headers) === null || _h === void 0 ? void 0 : _h["user-agent"],
                    },
                    riskLevel: P2PRiskLevel.HIGH,
                });
            }
            throw error;
        }
    });
}
async function getP2PAuditLogs(entityType, entityId, options, ctx) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching audit logs for ${entityType} ${entityId}`);
        const where = {
            relatedEntity: entityType,
            relatedEntityId: entityId,
        };
        if ((options === null || options === void 0 ? void 0 : options.startDate) || (options === null || options === void 0 ? void 0 : options.endDate)) {
            where.createdAt = {};
            if (options.startDate)
                where.createdAt.$gte = options.startDate;
            if (options.endDate)
                where.createdAt.$lte = options.endDate;
        }
        if ((_b = options === null || options === void 0 ? void 0 : options.eventTypes) === null || _b === void 0 ? void 0 : _b.length) {
            where.type = { $in: options.eventTypes };
        }
        const logs = await db_1.models.p2pActivityLog.findAll({
            where,
            limit: (options === null || options === void 0 ? void 0 : options.limit) || 100,
            offset: (options === null || options === void 0 ? void 0 : options.offset) || 0,
            order: [["createdAt", "DESC"]],
            include: [{
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                }],
        });
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, `Retrieved ${logs.length} audit log entries`);
        return logs;
    }
    catch (error) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message || "Failed to fetch audit logs");
        throw error;
    }
}
async function exportP2PAuditLogs(startDate, endDate, options, ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Exporting audit logs for compliance");
        const where = {
            createdAt: {
                $gte: startDate,
                $lte: endDate,
            },
        };
        if ((_b = options === null || options === void 0 ? void 0 : options.entityTypes) === null || _b === void 0 ? void 0 : _b.length) {
            where.relatedEntity = { $in: options.entityTypes };
        }
        if ((_c = options === null || options === void 0 ? void 0 : options.eventTypes) === null || _c === void 0 ? void 0 : _c.length) {
            where.type = { $in: options.eventTypes };
        }
        if ((_d = options === null || options === void 0 ? void 0 : options.userIds) === null || _d === void 0 ? void 0 : _d.length) {
            where.userId = { $in: options.userIds };
        }
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Fetching audit logs from database");
        const logs = await db_1.models.p2pActivityLog.findAll({
            where,
            order: [["createdAt", "ASC"]],
            include: [{
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                }],
        });
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, `Processing ${logs.length} audit log entries`);
        const exportData = logs.map(log => {
            var _a;
            return ({
                id: log.id,
                timestamp: log.createdAt,
                userId: log.userId,
                userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : "Unknown",
                userEmail: (_a = log.user) === null || _a === void 0 ? void 0 : _a.email,
                eventType: log.type,
                entityType: log.relatedEntity,
                entityId: log.relatedEntityId,
                metadata: log.details ? JSON.parse(log.details) : {},
                riskLevel: log.details ? JSON.parse(log.details).riskLevel : undefined,
                isAdminAction: log.details ? JSON.parse(log.details).isAdminAction : false,
                adminId: log.details ? JSON.parse(log.details).adminId : undefined,
            });
        });
        (_g = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _g === void 0 ? void 0 : _g.call(ctx, `Exported ${exportData.length} audit log entries`);
        return exportData;
    }
    catch (error) {
        (_h = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _h === void 0 ? void 0 : _h.call(ctx, error.message || "Failed to export audit logs");
        throw error;
    }
}
