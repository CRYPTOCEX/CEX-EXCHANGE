import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class p2pPaymentMethod
  extends Model<p2pPaymentMethodAttributes, p2pPaymentMethodCreationAttributes>
  implements p2pPaymentMethodAttributes
{
  id!: string;
  userId?: string;
  name!: string;
  icon!: string;
  description?: string;
  instructions?: string;
  processingTime?: string;
  fees?: string;
  available!: boolean;
  popularityRank!: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof p2pPaymentMethod {
    return p2pPaymentMethod.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "buyerId must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "Payment method name must not be empty" },
          },
        },
        icon: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: { notEmpty: { msg: "Icon URL must not be empty" } },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        instructions: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
        },
        processingTime: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        fees: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        available: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        popularityRank: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: "p2pPaymentMethod",
        tableName: "p2p_payment_methods",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    // Many-to-many with p2pOffer via the join table p2p_offer_payment_method
    p2pPaymentMethod.belongsToMany(models.p2pOffer, {
      through: "p2p_offer_payment_method",
      as: "offers",
      foreignKey: "paymentMethodId",
      otherKey: "offerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
