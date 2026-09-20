import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import user from "../user";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class exchangeWatchlist
  extends Model<
    exchangeWatchlistAttributes,
    exchangeWatchlistCreationAttributes
  >
  implements exchangeWatchlistAttributes
{
  id!: string;
  userId!: string;
  symbol!: string;
  type!: "SPOT" | "ECO" | "FUTURES";

  // exchangeWatchlist belongsTo user via userId
  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<user, string>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<user>;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof exchangeWatchlist {
    return exchangeWatchlist.init(
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
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
          comment: "ID of the user who added this symbol to watchlist",
        },
        symbol: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
          },
          comment: "Trading symbol/pair being watched",
        },
        // A spot market and a futures market share a symbol (BTC/USDT exists on
        // both), so a watchlist row that only carries the symbol cannot say which
        // market the user starred. Without this the client's own spot/futures
        // split could not be represented server-side at all.
        type: {
          type: DataTypes.ENUM("SPOT", "ECO", "FUTURES"),
          allowNull: false,
          defaultValue: "SPOT",
          comment: "Which market family the symbol belongs to",
        },
      },
      {
        sequelize,
        modelName: "exchangeWatchlist",
        tableName: "exchange_watchlist",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "exchangeWatchlistUserIdForeign",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          // One row per (user, symbol, market). The toggle endpoint reads then
          // writes, so two concurrent stars on the same symbol could both insert.
          {
            name: "exchangeWatchlistUserSymbolTypeKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "symbol" }, { name: "type" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    exchangeWatchlist.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
