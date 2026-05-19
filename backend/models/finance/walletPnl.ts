import { DataTypes, Model, Sequelize } from "sequelize";

export default class walletPnl
  extends Model<walletPnlAttributes, walletPnlCreationAttributes>
  implements walletPnlAttributes
{
  id!: string;
  userId!: string;
  balances!: {
    FIAT: number;
    SPOT: number;
    ECO: number;
  };
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize): typeof walletPnl {
    return walletPnl.init(
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
            isUUID: {
              args: 4,
              msg: "userId: User ID must be a valid UUID",
            },
          },
          comment: "ID of the user whose P&L is tracked",
        },
        balances: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const rawData = this.getDataValue("balances");
            // Parse the JSON string back into an object
            return rawData ? JSON.parse(rawData as any) : null;
          },
          comment: "Profit and loss balances for different wallet types (FIAT, SPOT, ECO)",
        },
      },
      {
        sequelize,
        modelName: "walletPnl",
        tableName: "wallet_pnl",
        timestamps: true,
      }
    );
  }
  public static associate(models: any) {
    walletPnl.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
