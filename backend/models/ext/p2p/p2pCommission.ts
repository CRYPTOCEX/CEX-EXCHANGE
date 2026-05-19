import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class p2pCommission
  extends Model<p2pCommissionAttributes, p2pCommissionCreationAttributes>
  implements p2pCommissionAttributes
{
  id!: string;
  adminId!: string;
  amount!: number;
  description?: string;
  tradeId?: string;
  offerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof p2pCommission {
    return p2pCommission.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        adminId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "adminId cannot be null" },
            isUUID: { args: 4, msg: "adminId must be a valid UUID" },
          },
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "amount must be a valid number" },
            min: { args: [0], msg: "amount cannot be negative" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        tradeId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "tradeId must be a valid UUID" },
          },
        },
        offerId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "offerId must be a valid UUID" },
          },
        },
      },
      {
        sequelize,
        modelName: "p2pCommission",
        tableName: "p2p_commissions",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    p2pCommission.belongsTo(models.user, {
      as: "admin",
      foreignKey: "adminId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    if (models.p2pTrade) {
      p2pCommission.belongsTo(models.p2pTrade, {
        as: "trade",
        foreignKey: "tradeId",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }
    if (models.p2pOffer) {
      p2pCommission.belongsTo(models.p2pOffer, {
        as: "offer",
        foreignKey: "offerId",
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      });
    }
  }
}
