import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

export interface p2pOfferFlagAttributes {
  id: string;
  offerId: string;
  isFlagged: boolean;
  reason?: string;
  flaggedAt: Date;
  flaggedById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface p2pOfferFlagCreationAttributes
  extends Optional<
    p2pOfferFlagAttributes,
    "id" | "reason" | "createdAt" | "updatedAt" | "deletedAt"
  > {}

export default class p2pOfferFlag
  extends Model<p2pOfferFlagAttributes, p2pOfferFlagCreationAttributes>
  implements p2pOfferFlagAttributes
{
  id!: string;
  offerId!: string;
  isFlagged!: boolean;
  reason?: string;
  flaggedAt!: Date;
  flaggedById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof p2pOfferFlag {
    return p2pOfferFlag.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        offerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: 4, msg: "offerId must be a valid UUID" },
          },
        },
        flaggedById: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "flaggedById must be a valid UUID" },
          },
        },
        isFlagged: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        flaggedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "p2pOfferFlag",
        tableName: "p2p_offer_flags",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    p2pOfferFlag.belongsTo(models.p2pOffer, {
      as: "offer",
      foreignKey: "offerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    p2pOfferFlag.belongsTo(models.user, {
      as: "flaggedBy",
      foreignKey: "flaggedById",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
