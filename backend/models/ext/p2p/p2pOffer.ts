import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class p2pOffer
  extends Model<p2pOfferAttributes, p2pOfferCreationAttributes>
  implements p2pOfferAttributes
{
  public id!: string;
  public userId!: string;
  public type!: "BUY" | "SELL";
  public currency!: string;
  public walletType!: "FIAT" | "SPOT" | "ECO";
  public amountConfig!: {
    total: number;
    min?: number;
    max?: number;
    availableBalance?: number;
  };
  public priceConfig!: {
    model: "FIXED" | "MARGIN";
    value: number;
    marketPrice?: number;
    finalPrice: number;
  };
  public tradeSettings!: {
    autoCancel: number;
    kycRequired: boolean;
    visibility: "PUBLIC" | "PRIVATE";
    termsOfTrade?: string;
    additionalNotes?: string;
  };
  public locationSettings?: {
    country?: string;
    region?: string;
    city?: string;
    restrictions?: string[];
  };
  public userRequirements?: {
    minCompletedTrades?: number;
    minSuccessRate?: number;
    minAccountAge?: number;
    trustedOnly?: boolean;
  };
  public status!:
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "ACTIVE"
    | "PAUSED"
    | "COMPLETED"
    | "CANCELLED"
    | "REJECTED"
    | "EXPIRED";
  public views!: number;
  public systemTags?: string[];
  public adminNotes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof p2pOffer {
    return p2pOffer.init(
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
          validate: { isUUID: { args: 4, msg: "userId must be a valid UUID" } },
        },
        type: {
          type: DataTypes.ENUM("BUY", "SELL"),
          allowNull: false,
          validate: {
            isIn: { args: [["BUY", "SELL"]], msg: "Invalid trade type" },
          },
        },
        currency: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "currency must not be empty" } },
        },
        walletType: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["FIAT", "SPOT", "ECO"]],
              msg: "Invalid wallet type",
            },
          },
        },
        amountConfig: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        priceConfig: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        tradeSettings: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        locationSettings: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        userRequirements: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(
            "DRAFT",
            "PENDING_APPROVAL",
            "ACTIVE",
            "PAUSED",
            "COMPLETED",
            "CANCELLED",
            "REJECTED",
            "EXPIRED"
          ),
          allowNull: false,
          defaultValue: "DRAFT",
        },
        views: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        systemTags: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        adminNotes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "p2pOffer",
        tableName: "p2p_offers",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    p2pOffer.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pOffer.belongsToMany(models.p2pPaymentMethod, {
      through: "p2p_offer_payment_method",
      as: "paymentMethods",
      foreignKey: "offerId",
      otherKey: "paymentMethodId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pOffer.hasOne(models.p2pOfferFlag, {
      as: "flag",
      foreignKey: "offerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pOffer.hasMany(models.p2pTrade, {
      as: "trades",
      foreignKey: "offerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
