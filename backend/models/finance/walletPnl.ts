import { DataTypes, Model, Sequelize } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

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
    /**
     * OPTIONAL because rows written before 2026-08-03 do not have it.
     *
     * All three writers of this row (this job's cron, `/api/finance/wallet?pnl=true`
     * and `/api/finance/wallet/stats`) now record FUTURES, but the stats route
     * derives the "24h change" chip by SUBTRACTING a stored row from its own
     * live total — so a historical row must still read cleanly, and every
     * consumer has to treat a missing key as 0 rather than assume it is there.
     */
    FUTURES?: number;
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
            isUUID: { args: ANY_UUID_VERSION,
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
            if (!rawData) return null;
            // MySQL returns JSON columns already parsed (object); MariaDB
            // returns the raw string. Only parse when a string arrives.
            if (typeof rawData === "string") {
              try {
                return JSON.parse(rawData);
              } catch {
                return null;
              }
            }
            return rawData;
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
