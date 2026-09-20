"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class userActivity extends sequelize_1.Model {
    static initModel(sequelize) {
        return userActivity.init({
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
            type: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
            },
            description: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
            severity: {
                type: sequelize_1.DataTypes.ENUM("success", "warning", "info"),
                allowNull: false,
                defaultValue: "info",
            },
            ip: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            userAgent: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("metadata");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
        }, {
            sequelize,
            modelName: "userActivity",
            tableName: "user_activity",
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
                    name: "userActivityUserIdCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "createdAt" }],
                },
                {
                    name: "userActivityTypeIdx",
                    using: "BTREE",
                    fields: [{ name: "type" }],
                },
            ],
        });
    }
    static associate(models) {
        userActivity.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
        });
    }
}
exports.default = userActivity;
