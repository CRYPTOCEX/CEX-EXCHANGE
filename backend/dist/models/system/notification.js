"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class notification extends sequelize_1.Model {
    static initModel(sequelize) {
        return notification.init({
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
                    isUUID: {
                        args: 4,
                        msg: "userId: Must be a valid UUID",
                    },
                },
            },
            relatedId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            title: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: "title: Notification title must not be empty",
                    },
                },
            },
            type: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: "type: Notification type must not be empty",
                    },
                },
            },
            message: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: "message: Notification message must not be empty",
                    },
                },
            },
            details: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            link: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            actions: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            read: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            idempotencyKey: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                field: "idempotency_key",
            },
            channels: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
            },
            priority: {
                type: sequelize_1.DataTypes.ENUM("LOW", "NORMAL", "HIGH", "URGENT"),
                allowNull: true,
                defaultValue: "NORMAL",
            },
        }, {
            sequelize,
            modelName: "notification",
            tableName: "notification",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "userId_index",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "type_index",
                    fields: [{ name: "type" }],
                },
                {
                    name: "idempotency_key_index",
                    fields: [{ name: "idempotency_key" }],
                },
            ],
            hooks: {
                beforeValidate: (instance) => {
                    if (instance.type) {
                        instance.type = instance.type.toLowerCase();
                    }
                },
            },
        });
    }
    static associate(models) {
        notification.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = notification;
