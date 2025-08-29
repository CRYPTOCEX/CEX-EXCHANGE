import { models } from "@b/db";

/**
 * Audit event types for P2P operations
 */
export enum P2PAuditEventType {
  // Trade events
  TRADE_INITIATED = "TRADE_INITIATED",
  TRADE_PAYMENT_CONFIRMED = "TRADE_PAYMENT_CONFIRMED",
  TRADE_FUNDS_RELEASED = "TRADE_FUNDS_RELEASED",
  TRADE_CANCELLED = "TRADE_CANCELLED",
  TRADE_DISPUTED = "TRADE_DISPUTED",
  TRADE_COMPLETED = "TRADE_COMPLETED",
  TRADE_EXPIRED = "TRADE_EXPIRED",
  
  // Offer events
  OFFER_CREATED = "OFFER_CREATED",
  OFFER_UPDATED = "OFFER_UPDATED",
  OFFER_DELETED = "OFFER_DELETED",
  OFFER_PAUSED = "OFFER_PAUSED",
  OFFER_ACTIVATED = "OFFER_ACTIVATED",
  
  // Financial events
  FUNDS_LOCKED = "FUNDS_LOCKED",
  FUNDS_UNLOCKED = "FUNDS_UNLOCKED",
  FUNDS_TRANSFERRED = "FUNDS_TRANSFERRED",
  FEE_CHARGED = "FEE_CHARGED",
  
  // Admin events
  ADMIN_TRADE_RESOLVED = "ADMIN_TRADE_RESOLVED",
  ADMIN_DISPUTE_RESOLVED = "ADMIN_DISPUTE_RESOLVED",
  ADMIN_OFFER_APPROVED = "ADMIN_OFFER_APPROVED",
  ADMIN_USER_BANNED = "ADMIN_USER_BANNED",
  
  // Security events
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  VALIDATION_FAILED = "VALIDATION_FAILED",
}

/**
 * Risk levels for audit events
 */
export enum P2PRiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Audit log entry interface
 */
export interface P2PAuditLog {
  userId: string;
  eventType: P2PAuditEventType;
  entityType: "TRADE" | "OFFER" | "DISPUTE" | "USER" | "WALLET";
  entityId: string;
  metadata: {
    amount?: number;
    currency?: string;
    previousState?: any;
    newState?: any;
    reason?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: any;
  };
  riskLevel?: P2PRiskLevel;
  isAdminAction?: boolean;
  adminId?: string;
}

/**
 * Create a comprehensive audit log entry
 */
export async function createP2PAuditLog(log: P2PAuditLog): Promise<void> {
  try {
    // Determine risk level if not provided
    const riskLevel = log.riskLevel || determineRiskLevel(log.eventType, log.metadata);
    
    // Create the audit log entry with correct field names
    await models.p2pActivityLog.create({
      userId: log.userId,
      type: log.eventType,
      action: log.eventType, // Use eventType as action since it describes what happened
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
    
    // For high-risk events, create additional alert
    if (riskLevel === P2PRiskLevel.HIGH || riskLevel === P2PRiskLevel.CRITICAL) {
      await createSecurityAlert(log, riskLevel);
    }
  } catch (error) {
    console.error("Failed to create P2P audit log:", error);
    // Audit logging should not break the main flow
  }
}

/**
 * Create a batch of audit logs (for complex operations)
 */
export async function createP2PAuditLogBatch(logs: P2PAuditLog[]): Promise<void> {
  try {
    const auditEntries = logs.map(log => ({
      userId: log.userId,
      type: log.eventType,
      action: log.eventType, // Use eventType as action
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
    
    await models.p2pActivityLog.bulkCreate(auditEntries);
  } catch (error) {
    console.error("Failed to create P2P audit log batch:", error);
  }
}

/**
 * Determine risk level based on event type and metadata
 */
function determineRiskLevel(eventType: P2PAuditEventType, metadata: any): P2PRiskLevel {
  // Critical risk events
  if ([
    P2PAuditEventType.FUNDS_TRANSFERRED,
    P2PAuditEventType.UNAUTHORIZED_ACCESS,
    P2PAuditEventType.ADMIN_USER_BANNED,
  ].includes(eventType)) {
    return P2PRiskLevel.CRITICAL;
  }
  
  // High risk events
  if ([
    P2PAuditEventType.TRADE_DISPUTED,
    P2PAuditEventType.SUSPICIOUS_ACTIVITY,
    P2PAuditEventType.ADMIN_TRADE_RESOLVED,
    P2PAuditEventType.ADMIN_DISPUTE_RESOLVED,
  ].includes(eventType)) {
    return P2PRiskLevel.HIGH;
  }
  
  // Medium risk based on amount
  if (metadata.amount && metadata.amount > 1000) {
    return P2PRiskLevel.MEDIUM;
  }
  
  // Medium risk events
  if ([
    P2PAuditEventType.TRADE_CANCELLED,
    P2PAuditEventType.OFFER_DELETED,
    P2PAuditEventType.RATE_LIMIT_EXCEEDED,
  ].includes(eventType)) {
    return P2PRiskLevel.MEDIUM;
  }
  
  return P2PRiskLevel.LOW;
}

/**
 * Create security alert for high-risk events
 */
async function createSecurityAlert(log: P2PAuditLog, riskLevel: P2PRiskLevel): Promise<void> {
  try {
    // Create notification for admins
    // const { notifyAdmins } = await import("./notifications");
    // TODO: Implement notifyAdmins function
    
    // TODO: Implement admin notification
    // await notifyAdmins("P2P_SECURITY_ALERT", {
    //   eventType: log.eventType,
    //   entityType: log.entityType,
    //   entityId: log.entityId,
    //   userId: log.userId,
    //   adminId: log.adminId,
    //   riskLevel,
    //   metadata: log.metadata,
    //   timestamp: new Date().toISOString(),
    // });
    
    // Log to security monitoring system
    console.warn("P2P Security Alert:", {
      eventType: log.eventType,
      riskLevel,
      userId: log.userId,
      entityId: log.entityId,
    });
  } catch (error) {
    console.error("Failed to create security alert:", error);
  }
}

/**
 * Audit wrapper for critical operations
 */
export function withAuditLog<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  eventType: P2PAuditEventType,
  entityType: P2PAuditLog["entityType"]
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    let result: any;
    let error: any;
    
    try {
      result = await fn(...args);
      
      // Extract audit information from function context
      const context = args[0]; // Assuming first arg is the request context
      if (context?.user?.id && context?.params?.id) {
        await createP2PAuditLog({
          userId: context.user.id,
          eventType,
          entityType,
          entityId: context.params.id,
          metadata: {
            success: true,
            executionTime: Date.now() - startTime,
            ip: context.ip || context.connection?.remoteAddress,
            userAgent: context.headers?.["user-agent"],
          },
        });
      }
      
      return result;
    } catch (err) {
      error = err;
      
      // Log failed attempts
      const context = args[0];
      if (context?.user?.id && context?.params?.id) {
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
            ip: context.ip || context.connection?.remoteAddress,
            userAgent: context.headers?.["user-agent"],
          },
          riskLevel: P2PRiskLevel.HIGH,
        });
      }
      
      throw error;
    }
  }) as T;
}

/**
 * Get audit logs for an entity
 */
export async function getP2PAuditLogs(
  entityType: string,
  entityId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    eventTypes?: P2PAuditEventType[];
    riskLevels?: P2PRiskLevel[];
  }
) {
  const where: any = {
    relatedEntity: entityType,
    relatedEntityId: entityId,
  };
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.$gte = options.startDate;
    if (options.endDate) where.createdAt.$lte = options.endDate;
  }
  
  if (options?.eventTypes?.length) {
    where.type = { $in: options.eventTypes };
  }
  
  return models.p2pActivityLog.findAll({
    where,
    limit: options?.limit || 100,
    offset: options?.offset || 0,
    order: [["createdAt", "DESC"]],
    include: [{
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email"],
    }],
  });
}

/**
 * Export audit logs for compliance
 */
export async function exportP2PAuditLogs(
  startDate: Date,
  endDate: Date,
  options?: {
    entityTypes?: string[];
    eventTypes?: P2PAuditEventType[];
    userIds?: string[];
  }
): Promise<any[]> {
  const where: any = {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };
  
  if (options?.entityTypes?.length) {
    where.relatedEntity = { $in: options.entityTypes };
  }
  
  if (options?.eventTypes?.length) {
    where.type = { $in: options.eventTypes };
  }
  
  if (options?.userIds?.length) {
    where.userId = { $in: options.userIds };
  }
  
  const logs = await models.p2pActivityLog.findAll({
    where,
    order: [["createdAt", "ASC"]],
    include: [{
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email"],
    }],
  });
  
  return logs.map(log => ({
    id: log.id,
    timestamp: log.createdAt,
    userId: log.userId,
    userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : "Unknown",
    userEmail: log.user?.email,
    eventType: log.type,
    entityType: log.relatedEntity,
    entityId: log.relatedEntityId,
    metadata: log.details ? JSON.parse(log.details) : {},
    riskLevel: log.details ? JSON.parse(log.details).riskLevel : undefined,
    isAdminAction: log.details ? JSON.parse(log.details).isAdminAction : false,
    adminId: log.details ? JSON.parse(log.details).adminId : undefined,
  }));
}