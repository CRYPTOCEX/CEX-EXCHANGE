"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class notificationTemplate extends sequelize_1.Model {
    static initModel(sequelize) {
        return notificationTemplate.init({
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name cannot be empty" },
                },
            },
            subject: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "subject: Subject cannot be empty" },
                },
            },
            emailBody: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
            smsBody: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
            pushBody: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
            shortCodes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            email: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
            },
            sms: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
            },
            push: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
            },
        }, {
            sequelize,
            modelName: "notificationTemplate",
            tableName: "notification_template",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "notificationTemplateNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = notificationTemplate;
