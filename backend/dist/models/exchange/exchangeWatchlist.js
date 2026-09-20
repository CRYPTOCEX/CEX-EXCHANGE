"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class exchangeWatchlist extends sequelize_1.Model {
    static initModel(sequelize) {
        return exchangeWatchlist.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
                },
                comment: "ID of the user who added this symbol to watchlist",
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol must not be empty" },
                },
                comment: "Trading symbol/pair being watched",
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("SPOT", "ECO", "FUTURES"),
                allowNull: false,
                defaultValue: "SPOT",
                comment: "Which market family the symbol belongs to",
            },
        }, {
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
                {
                    name: "exchangeWatchlistUserSymbolTypeKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "symbol" }, { name: "type" }],
                },
            ],
        });
    }
    static associate(models) {
        exchangeWatchlist.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = exchangeWatchlist;
