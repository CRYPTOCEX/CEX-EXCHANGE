import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

// Strategy status types
export type StrategyStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

// Strategy visibility
export type StrategyVisibility = "PRIVATE" | "PUBLIC";

// Strategy type
export type StrategyType =
  | "DCA"
  | "GRID"
  | "INDICATOR"
  | "TRAILING_STOP"
  | "CUSTOM";

// Risk level
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface tradingBotStrategyAttributes {
  id: string;
  creatorId: string;

  // Basic Info
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  icon?: string;
  coverImage?: string;

  // Type & Category
  type: StrategyType;
  category?: string;
  tags: string[];

  // Strategy Configuration
  defaultConfig: Record<string, any>;
  customNodes?: Record<string, any>;

  // Recommended Settings
  recommendedSymbols: string[];
  recommendedTimeframe?: string;
  minAllocation?: number;
  riskLevel: RiskLevel;

  // Marketplace
  status: StrategyStatus;
  visibility: StrategyVisibility;
  price: number;
  currency: string; // Currency for the price (e.g., USDT, BTC)
  isFeatured: boolean;
  featuredOrder?: number;

  // Statistics
  totalPurchases: number;
  totalUsers: number;
  avgRating?: number;
  totalRatings: number;

  // Revenue
  totalRevenue: number;
  creatorRevenue: number;
  platformRevenue: number;

  // Review
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;

  // Version Control
  version: string;
  changelog?: string;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface tradingBotStrategyCreationAttributes
  extends Omit<
    tradingBotStrategyAttributes,
    | "id"
    | "status"
    | "visibility"
    | "price"
    | "isFeatured"
    | "totalPurchases"
    | "totalUsers"
    | "totalRatings"
    | "totalRevenue"
    | "creatorRevenue"
    | "platformRevenue"
    | "version"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  > {}

export default class tradingBotStrategy
  extends Model<tradingBotStrategyAttributes, tradingBotStrategyCreationAttributes>
  implements tradingBotStrategyAttributes
{
  id!: string;
  creatorId!: string;
  name!: string;
  slug!: string;
  description!: string;
  shortDescription?: string;
  icon?: string;
  coverImage?: string;
  type!: StrategyType;
  category?: string;
  tags!: string[];
  defaultConfig!: Record<string, any>;
  customNodes?: Record<string, any>;
  recommendedSymbols!: string[];
  recommendedTimeframe?: string;
  minAllocation?: number;
  riskLevel!: RiskLevel;
  status!: StrategyStatus;
  visibility!: StrategyVisibility;
  price!: number;
  currency!: string;
  isFeatured!: boolean;
  featuredOrder?: number;
  totalPurchases!: number;
  totalUsers!: number;
  avgRating?: number;
  totalRatings!: number;
  totalRevenue!: number;
  creatorRevenue!: number;
  platformRevenue!: number;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
  version!: string;
  changelog?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof tradingBotStrategy {
    return tradingBotStrategy.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        creatorId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "creatorId: Creator ID must not be empty" },
            isUUID: { args: 4, msg: "creatorId: Must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Strategy name must not be empty" },
            len: {
              args: [1, 100],
              msg: "name: Strategy name must be between 1 and 100 characters",
            },
          },
        },
        slug: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "slug: Slug must not be empty" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        shortDescription: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        icon: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        coverImage: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        type: {
          type: DataTypes.ENUM("DCA", "GRID", "INDICATOR", "TRAILING_STOP", "CUSTOM"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["DCA", "GRID", "INDICATOR", "TRAILING_STOP", "CUSTOM"]],
              msg: "type: Must be a valid strategy type",
            },
          },
        },
        category: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        tags: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
        defaultConfig: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        customNodes: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        recommendedSymbols: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
        recommendedTimeframe: {
          type: DataTypes.STRING(10),
          allowNull: true,
        },
        minAllocation: {
          type: DataTypes.DECIMAL(18, 8),
          allowNull: true,
          defaultValue: 100,
          get() {
            const value = this.getDataValue("minAllocation");
            return value ? parseFloat(value.toString()) : 100;
          },
        },
        riskLevel: {
          type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
          allowNull: false,
          defaultValue: "MEDIUM",
          validate: {
            isIn: {
              args: [["LOW", "MEDIUM", "HIGH"]],
              msg: "riskLevel: Must be LOW, MEDIUM, or HIGH",
            },
          },
        },
        status: {
          type: DataTypes.ENUM("DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"),
          allowNull: false,
          defaultValue: "DRAFT",
          validate: {
            isIn: {
              args: [["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"]],
              msg: "status: Must be a valid status",
            },
          },
        },
        visibility: {
          type: DataTypes.ENUM("PRIVATE", "PUBLIC"),
          allowNull: false,
          defaultValue: "PRIVATE",
          validate: {
            isIn: {
              args: [["PRIVATE", "PUBLIC"]],
              msg: "visibility: Must be PRIVATE or PUBLIC",
            },
          },
        },
        price: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("price");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        currency: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "USDT",
        },
        isFeatured: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        featuredOrder: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        totalPurchases: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        totalUsers: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        avgRating: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: true,
          get() {
            const value = this.getDataValue("avgRating");
            return value ? parseFloat(value.toString()) : null;
          },
        },
        totalRatings: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        totalRevenue: {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalRevenue");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        creatorRevenue: {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("creatorRevenue");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        platformRevenue: {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("platformRevenue");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        reviewedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        reviewedBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        rejectionReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        version: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "1.0.0",
        },
        changelog: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "tradingBotStrategy",
        tableName: "trading_bot_strategy",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "tradingBotStrategySlugIdx",
            unique: true,
            using: "BTREE",
            fields: [{ name: "slug" }],
          },
          {
            name: "tradingBotStrategyCreatorIdIdx",
            using: "BTREE",
            fields: [{ name: "creatorId" }],
          },
          {
            name: "tradingBotStrategyStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "tradingBotStrategyVisibilityIdx",
            using: "BTREE",
            fields: [{ name: "visibility" }],
          },
          {
            name: "tradingBotStrategyTypeIdx",
            using: "BTREE",
            fields: [{ name: "type" }],
          },
          {
            name: "tradingBotStrategyFeaturedIdx",
            using: "BTREE",
            fields: [{ name: "isFeatured" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    tradingBotStrategy.belongsTo(models.user, {
      as: "creator",
      foreignKey: "creatorId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    tradingBotStrategy.hasMany(models.tradingBotPurchase, {
      as: "purchases",
      foreignKey: "strategyId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
