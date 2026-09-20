"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class forexAccountSignal extends sequelize_1.Model {
    static initModel(sequelize) {
        return forexAccountSignal.init({
            forexAccountId: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                allowNull: false,
                primaryKey: true,
            },
            forexSignalId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
            },
        }, {
            sequelize,
            modelName: "forexAccountSignal",
            tableName: "forex_account_signal",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "forexAccountId" }, { name: "forexSignalId" }],
                },
                {
                    name: "forexAccountSignalForexSignalIdFkey",
                    using: "BTREE",
                    fields: [{ name: "forexSignalId" }],
                },
            ],
        });
    }
    static associate(models) {
        forexAccountSignal.belongsTo(models.forexAccount, {
            as: "forexAccount",
            foreignKey: "forexAccountId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        forexAccountSignal.belongsTo(models.forexSignal, {
            as: "forexSignal",
            foreignKey: "forexSignalId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = forexAccountSignal;
