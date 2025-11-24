import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class p2pDispute
  extends Model<p2pDisputeAttributes, p2pDisputeCreationAttributes>
  implements p2pDisputeAttributes
{
  id!: string;
  tradeId!: string;
  amount!: string;
  reportedById!: string;
  againstId!: string;
  reason!: string;
  details?: string;
  filedOn!: Date;
  status!: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  priority!: "HIGH" | "MEDIUM" | "LOW";
  resolution?: any;
  resolvedOn?: Date;
  messages?: any;
  evidence?: any;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof p2pDispute {
    return p2pDispute.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        tradeId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "tradeId is required" },
            isUUID: { args: 4, msg: "tradeId must be a valid UUID" },
          },
        },
        amount: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "amount must not be empty" } },
        },
        reportedById: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "reportedById is required" },
            isUUID: { args: 4, msg: "reportedById must be a valid UUID" },
          },
        },
        againstId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "againstId is required" },
            isUUID: { args: 4, msg: "againstId must be a valid UUID" },
          },
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: { notEmpty: { msg: "reason must not be empty" } },
        },
        details: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        filedOn: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isDate: { args: true, msg: "filedOn must be a valid date" },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "IN_PROGRESS", "RESOLVED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "IN_PROGRESS", "RESOLVED"]],
              msg: "Invalid dispute status",
            },
          },
        },
        priority: {
          type: DataTypes.ENUM("HIGH", "MEDIUM", "LOW"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["HIGH", "MEDIUM", "LOW"]],
              msg: "Invalid priority",
            },
          },
        },
        resolution: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        resolvedOn: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        messages: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        evidence: {
          type: DataTypes.JSON,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "p2pDispute",
        tableName: "p2p_disputes",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    p2pDispute.belongsTo(models.p2pTrade, {
      as: "trade",
      foreignKey: "tradeId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pDispute.belongsTo(models.user, {
      as: "reportedBy",
      foreignKey: "reportedById",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pDispute.belongsTo(models.user, {
      as: "against",
      foreignKey: "againstId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
