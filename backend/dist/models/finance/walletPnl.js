"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class walletPnl extends sequelize_1.Model {
    static initModel(sequelize) {
        return walletPnl.init({
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
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION,
                        msg: "userId: User ID must be a valid UUID", },
                },
                comment: "ID of the user whose P&L is tracked",
            },
            balances: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const rawData = this.getDataValue("balances");
                    if (!rawData)
                        return null;
                    if (typeof rawData === "string") {
                        try {
                            return JSON.parse(rawData);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return rawData;
                },
                comment: "Profit and loss balances for different wallet types (FIAT, SPOT, ECO)",
            },
        }, {
            sequelize,
            modelName: "walletPnl",
            tableName: "wallet_pnl",
            timestamps: true,
        });
    }
    static associate(models) {
        walletPnl.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = walletPnl;
