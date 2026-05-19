import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Entity types
export type AuditEntityType =
  | "BOT"
  | "TRADE"
  | "ORDER"
  | "STRATEGY"
  | "PURCHASE";

// Audit action types
export type AuditAction =
  // Bot Lifecycle
  | "BOT_CREATED"
  | "BOT_UPDATED"
  | "BOT_STARTED"
  | "BOT_STOPPED"
  | "BOT_PAUSED"
  | "BOT_RESUMED"
  | "BOT_DELETED"
  | "BOT_ERROR"
  // Trading
  | "TRADE_OPENED"
  | "TRADE_CLOSED"
  | "TRADE_FAILED"
  | "ORDER_PLACED"
  | "ORDER_CANCELLED"
  | "ORDER_FILLED"
  // Risk Management
  | "DAILY_LIMIT_REACHED"
  | "DRAWDOWN_LIMIT_REACHED"
  | "STOP_LOSS_TRIGGERED"
  | "TAKE_PROFIT_TRIGGERED"
  | "KILL_SWITCH_ACTIVATED"
  // Allocation
  | "FUNDS_ALLOCATED"
  | "FUNDS_DEALLOCATED"
  // Marketplace
  | "STRATEGY_PURCHASED"
  | "STRATEGY_SUBMITTED"
  | "STRATEGY_APPROVED"
  | "STRATEGY_REJECTED"
  // Admin
  | "ADMIN_FORCE_STOP"
  | "ADMIN_CONFIG_CHANGE";

export interface tradingBotAuditLogAttributes {
  id: string;

  // Entity References
  entityType: AuditEntityType;
  entityId: string;
  botId?: string;

  // Action
  action: AuditAction;

  // Who
  userId?: string;
  adminId?: string;
  isSystem: boolean;

  // Details
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;

  // Context
  reason?: string;
  ipAddress?: string;
  userAgent?: string;

  createdAt?: Date;
}

export interface tradingBotAuditLogCreationAttributes
  extends Omit<
    tradingBotAuditLogAttributes,
    "id" | "isSystem" | "createdAt"
  > {}

export default class tradingBotAuditLog
  extends Model<tradingBotAuditLogAttributes, tradingBotAuditLogCreationAttributes>
  implements tradingBotAuditLogAttributes
{
  id!: string;
  entityType!: AuditEntityType;
  entityId!: string;
  botId?: string;
  action!: AuditAction;
  userId?: string;
  adminId?: string;
  isSystem!: boolean;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof tradingBotAuditLog {
    return tradingBotAuditLog.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        entityType: {
          type: DataTypes.ENUM("BOT", "TRADE", "ORDER", "STRATEGY", "PURCHASE"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["BOT", "TRADE", "ORDER", "STRATEGY", "PURCHASE"]],
              msg: "entityType: Must be a valid entity type",
            },
          },
        },
        entityId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "entityId: Entity ID must not be empty" },
            isUUID: { args: 4, msg: "entityId: Must be a valid UUID" },
          },
        },
        botId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        action: {
          type: DataTypes.ENUM(
            // Bot Lifecycle
            "BOT_CREATED",
            "BOT_UPDATED",
            "BOT_STARTED",
            "BOT_STOPPED",
            "BOT_PAUSED",
            "BOT_RESUMED",
            "BOT_DELETED",
            "BOT_ERROR",
            // Trading
            "TRADE_OPENED",
            "TRADE_CLOSED",
            "TRADE_FAILED",
            "ORDER_PLACED",
            "ORDER_CANCELLED",
            "ORDER_FILLED",
            // Risk Management
            "DAILY_LIMIT_REACHED",
            "DRAWDOWN_LIMIT_REACHED",
            "STOP_LOSS_TRIGGERED",
            "TAKE_PROFIT_TRIGGERED",
            "KILL_SWITCH_ACTIVATED",
            // Allocation
            "FUNDS_ALLOCATED",
            "FUNDS_DEALLOCATED",
            // Marketplace
            "STRATEGY_PURCHASED",
            "STRATEGY_SUBMITTED",
            "STRATEGY_APPROVED",
            "STRATEGY_REJECTED",
            // Admin
            "ADMIN_FORCE_STOP",
            "ADMIN_CONFIG_CHANGE"
          ),
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        adminId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        isSystem: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        oldValue: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        newValue: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        ipAddress: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "tradingBotAuditLog",
        tableName: "trading_bot_audit_log",
        timestamps: true,
        updatedAt: false, // Audit logs are immutable
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "tradingBotAuditLogEntityIdx",
            using: "BTREE",
            fields: [{ name: "entityType" }, { name: "entityId" }],
          },
          {
            name: "tradingBotAuditLogBotIdIdx",
            using: "BTREE",
            fields: [{ name: "botId" }],
          },
          {
            name: "tradingBotAuditLogUserIdIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "tradingBotAuditLogActionIdx",
            using: "BTREE",
            fields: [{ name: "action" }],
          },
          {
            name: "tradingBotAuditLogCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    tradingBotAuditLog.belongsTo(models.tradingBot, {
      as: "bot",
      foreignKey: "botId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    tradingBotAuditLog.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    tradingBotAuditLog.belongsTo(models.user, {
      as: "admin",
      foreignKey: "adminId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
