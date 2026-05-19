"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class settings extends sequelize_1.Model {
    static initModel(sequelize) {
        return settings.init({
            key: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                primaryKey: true,
                comment: "Unique setting key identifier",
            },
            value: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
                comment: "Setting value in JSON format or plain text",
            },
        }, {
            sequelize,
            modelName: "settings",
            tableName: "settings",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "key" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = settings;
