type AuditEntityType =
  | "LEADER"
  | "FOLLOWER"
  | "TRADE"
  | "TRANSACTION"
  | "SETTINGS";
type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "SUSPEND"
  | "ACTIVATE"
  | "FOLLOW"
  | "UNFOLLOW"
  | "PAUSE"
  | "RESUME"
  | "ALLOCATE"
  | "DEALLOCATE"
  | "FORCE_STOP"
  | "RECALCULATE";

interface copyTradingAuditLogAttributes {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  adminId?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  metadata?: string;
  createdAt: Date;
}

type copyTradingAuditLogPk = "id";
type copyTradingAuditLogId = copyTradingAuditLogAttributes[copyTradingAuditLogPk];
type copyTradingAuditLogOptionalAttributes =
  | "id"
  | "oldValue"
  | "newValue"
  | "userId"
  | "adminId"
  | "ipAddress"
  | "userAgent"
  | "reason"
  | "metadata"
  | "createdAt";
type copyTradingAuditLogCreationAttributes = Optional<
  copyTradingAuditLogAttributes,
  copyTradingAuditLogOptionalAttributes
>;
