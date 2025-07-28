import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class icoTokenOffering
  extends Model<icoTokenOfferingAttributes, icoTokenOfferingCreationAttributes>
  implements icoTokenOfferingAttributes
{
  id!: string;
  userId!: string;
  planId!: string;
  typeId!: string;
  name!: string;
  symbol!: string;
  icon!: string;
  status!:
    | "ACTIVE"
    | "SUCCESS"
    | "FAILED"
    | "UPCOMING"
    | "PENDING"
    | "REJECTED";
  purchaseWalletCurrency!: string;
  purchaseWalletType!: string;
  tokenPrice!: number;
  targetAmount!: number;
  startDate!: Date;
  endDate!: Date;
  participants!: number;
  currentPrice?: number;
  priceChange?: number;
  submittedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  reviewNotes?: string;
  isPaused!: boolean;
  isFlagged!: boolean;
  featured?: boolean;
  website?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoTokenOffering {
    return icoTokenOffering.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "userId: User ID must be a valid UUID",
            },
          },
        },
        planId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "planId: Plan ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "planId: Plan ID must be a valid UUID",
            },
          },
        },
        typeId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "typeId: Type ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "typeId: Type ID must be a valid UUID",
            },
          },
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
        },
        symbol: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
          },
        },
        icon: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "icon: Icon must not be empty" },
          },
        },
        status: {
          type: DataTypes.ENUM(
            "ACTIVE",
            "SUCCESS",
            "FAILED",
            "UPCOMING",
            "PENDING",
            "REJECTED"
          ),
          allowNull: false,
          validate: {
            isIn: {
              args: [
                [
                  "ACTIVE",
                  "SUCCESS",
                  "FAILED",
                  "UPCOMING",
                  "PENDING",
                  "REJECTED",
                ],
              ],
              msg: "status: Invalid status value",
            },
          },
        },
        purchaseWalletCurrency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: "purchaseWalletCurrency: Currency must not be empty",
            },
          },
        },
        purchaseWalletType: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: "purchaseWalletType: Wallet type must not be empty",
            },
          },
        },
        tokenPrice: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "tokenPrice: Must be a valid number" },
            min: { args: [0], msg: "tokenPrice: Cannot be negative" },
          },
        },
        targetAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "targetAmount: Must be a valid number" },
            min: { args: [0], msg: "targetAmount: Cannot be negative" },
          },
        },
        startDate: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isDate: { msg: "startDate: Must be a valid date", args: true },
          },
        },
        endDate: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isDate: { msg: "endDate: Must be a valid date", args: true },
          },
        },
        participants: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "participants: Must be an integer" },
            min: { args: [0], msg: "participants: Cannot be negative" },
          },
        },
        currentPrice: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isFloat: { msg: "currentPrice: Must be a valid number" },
            min: { args: [0], msg: "currentPrice: Cannot be negative" },
          },
        },
        priceChange: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isFloat: { msg: "priceChange: Must be a valid number" },
          },
        },
        submittedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: { msg: "submittedAt: Must be a valid date", args: true },
          },
        },
        approvedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: { msg: "approvedAt: Must be a valid date", args: true },
          },
        },
        rejectedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: { msg: "rejectedAt: Must be a valid date", args: true },
          },
        },
        reviewNotes: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        isPaused: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isFlagged: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        featured: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        website: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "icoTokenOffering",
        tableName: "ico_token_offering",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "icoTokenOfferingSymbolKey",
            unique: true,
            fields: [{ name: "symbol" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoTokenOffering.belongsTo(models.icoLaunchPlan, {
      as: "plan",
      foreignKey: "planId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenOffering.hasMany(models.icoTokenOfferingPhase, {
      as: "phases",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenOffering.hasOne(models.icoTokenDetail, {
      as: "tokenDetail",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenOffering.hasMany(models.icoRoadmapItem, {
      as: "roadmapItems",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenOffering.hasMany(models.icoTeamMember, {
      as: "teamMembers",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenOffering.hasMany(models.icoTransaction, {
      as: "transactions",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenOffering.hasMany(models.icoAdminActivity, {
      as: "adminActivities",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenOffering.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenOffering.belongsTo(models.icoTokenType, {
      as: "type",
      foreignKey: "typeId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    icoTokenOffering.hasMany(models.icoTokenOfferingUpdate, {
      as: "updates",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
