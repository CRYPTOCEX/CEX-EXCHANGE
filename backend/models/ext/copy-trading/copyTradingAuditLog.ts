import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export type AuditEntityType =
  | "LEADER"
  | "FOLLOWER"
  | "TRADE"
  | "TRANSACTION"
  | "SETTINGS";
export type AuditAction =
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

export interface copyTradingAuditLogAttributes {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;

  // Change tracking
  oldValue?: string;
  newValue?: string;

  // Actor information
  userId?: string;
  adminId?: string;
  ipAddress?: string;
  userAgent?: string;

  // Additional context
  reason?: string;
  metadata?: string;

  // Timestamps
  createdAt: Date;
}

export interface copyTradingAuditLogCreationAttributes
  extends Omit<copyTradingAuditLogAttributes, "id" | "createdAt"> {}

export default class copyTradingAuditLog
  extends Model<
    copyTradingAuditLogAttributes,
    copyTradingAuditLogCreationAttributes
  >
  implements copyTradingAuditLogAttributes
{
  id!: string;
  entityType!: AuditEntityType;
  entityId!: string;
  action!: AuditAction;

  oldValue?: string;
  newValue?: string;

  userId?: string;
  adminId?: string;
  ipAddress?: string;
  userAgent?: string;

  reason?: string;
  metadata?: string;

  createdAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof copyTradingAuditLog {
    return copyTradingAuditLog.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        entityType: {
          type: DataTypes.ENUM(
            "LEADER",
            "FOLLOWER",
            "TRADE",
            "TRANSACTION",
            "SETTINGS"
          ),
          allowNull: false,
        },
        entityId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        action: {
          type: DataTypes.ENUM(
            "CREATE",
            "UPDATE",
            "DELETE",
            "APPROVE",
            "REJECT",
            "SUSPEND",
            "ACTIVATE",
            "FOLLOW",
            "UNFOLLOW",
            "PAUSE",
            "RESUME",
            "ALLOCATE",
            "DEALLOCATE",
            "FORCE_STOP",
            "RECALCULATE"
          ),
          allowNull: false,
        },

        // Change tracking
        oldValue: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        newValue: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        // Actor information
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        adminId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        ipAddress: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },

        // Additional context
        reason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        // Timestamps
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "copyTradingAuditLog",
        tableName: "copy_trading_audit_logs",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "copy_trading_audit_logs_entity_idx",
            fields: [{ name: "entityType" }, { name: "entityId" }],
          },
          {
            name: "copy_trading_audit_logs_action_idx",
            fields: [{ name: "action" }],
          },
          {
            name: "copy_trading_audit_logs_user_id_idx",
            fields: [{ name: "userId" }],
          },
          {
            name: "copy_trading_audit_logs_admin_id_idx",
            fields: [{ name: "adminId" }],
          },
          {
            name: "copy_trading_audit_logs_created_at_idx",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    copyTradingAuditLog.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    copyTradingAuditLog.belongsTo(models.user, {
      foreignKey: "adminId",
      as: "admin",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
