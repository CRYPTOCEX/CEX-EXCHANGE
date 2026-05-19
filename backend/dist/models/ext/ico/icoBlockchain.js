"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoBlockchain extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoBlockchain.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Blockchain name must not be empty" },
                },
            },
            value: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "value: Blockchain value must not be empty" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        }, {
            sequelize,
            modelName: "icoBlockchain",
            tableName: "ico_blockchain",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "icoBlockchainNameKey",
                    unique: true,
                    fields: [{ name: "name" }],
                },
            ],
        });
    }
    static associate(models) {
    }
}
exports.default = icoBlockchain;
