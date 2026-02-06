"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class userBlock extends sequelize_1.Model {
    static initModel(sequelize) {
        return userBlock.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                comment: "ID of the user being blocked",
            },
            adminId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                comment: "ID of the admin who created this block",
            },
            reason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    len: {
                        args: [1, 1000],
                        msg: "reason: Reason must be between 1 and 1000 characters",
                    },
                },
                comment: "Reason for blocking the user",
            },
            isTemporary: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Whether this is a temporary or permanent block",
            },
            duration: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: {
                        args: [1],
                        msg: "duration: Duration must be at least 1 hour",
                    },
                    max: {
                        args: [8760],
                        msg: "duration: Duration cannot exceed 1 year",
                    },
                },
                comment: "Block duration in hours (for temporary blocks)",
            },
            blockedUntil: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Date and time when the block expires",
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: "Whether this block is currently active",
            },
        }, {
            sequelize,
            modelName: "userBlock",
            tableName: "user_blocks",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "user_blocks_userId_idx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "user_blocks_adminId_idx",
                    using: "BTREE",
                    fields: [{ name: "adminId" }],
                },
                {
                    name: "user_blocks_isActive_idx",
                    using: "BTREE",
                    fields: [{ name: "isActive" }],
                },
            ],
        });
    }
    static associate(models) {
        userBlock.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
            constraints: false,
        });
        userBlock.belongsTo(models.user, {
            as: "admin",
            foreignKey: "adminId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
            constraints: false,
        });
    }
}
exports.default = userBlock;
