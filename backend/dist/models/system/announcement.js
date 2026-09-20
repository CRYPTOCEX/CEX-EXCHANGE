"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class announcement extends sequelize_1.Model {
    static initModel(sequelize) {
        return announcement.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("GENERAL", "EVENT", "UPDATE"),
                allowNull: false,
                defaultValue: "GENERAL",
                validate: {
                    isIn: {
                        args: [["GENERAL", "EVENT", "UPDATE"]],
                        msg: "type: Type must be one of GENERAL, EVENT, UPDATE",
                    },
                },
            },
            title: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title cannot be empty" },
                },
            },
            message: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "message: Message cannot be empty" },
                },
            },
            link: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: true,
            },
        }, {
            sequelize,
            modelName: "announcement",
            tableName: "announcement",
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
    static associate(models) { }
}
exports.default = announcement;
