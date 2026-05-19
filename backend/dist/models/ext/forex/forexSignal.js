"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class forexSignal extends sequelize_1.Model {
    static initModel(sequelize) {
        return forexSignal.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title cannot be empty" },
                },
            },
            image: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "image: Image cannot be empty" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
            },
        }, {
            sequelize,
            modelName: "forexSignal",
            tableName: "forex_signal",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
            ],
        });
    }
    static associate(models) {
        forexSignal.hasMany(models.forexAccountSignal, {
            as: "forexAccountSignals",
            foreignKey: "forexSignalId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        forexSignal.belongsToMany(models.forexAccount, {
            as: "signalAccounts",
            through: models.forexAccountSignal,
            foreignKey: "forexSignalId",
            otherKey: "forexAccountId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = forexSignal;
