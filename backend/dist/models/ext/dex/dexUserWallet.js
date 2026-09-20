"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class dexUserWallet extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexUserWallet.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            vault: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: true,
                    len: {
                        args: [1, 32768],
                        msg: "dexUserWallet.vault exceeds the 32 KB envelope limit",
                    },
                },
            },
            vaultVersion: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            label: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            backedUpAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastUnlockedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "dexUserWallet",
            tableName: "dex_user_wallet",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "dexUserWalletUserKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        dexUserWallet.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = dexUserWallet;
