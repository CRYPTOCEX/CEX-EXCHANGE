"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class stakingAdminActivity extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingAdminActivity.init({
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
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
            },
            action: {
                type: sequelize_1.DataTypes.ENUM("create", "update", "delete", "approve", "reject", "distribute"),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "action: Action is required" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("pool", "position", "earnings", "settings", "withdrawal"),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "type: Type is required" },
                },
            },
            relatedId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "relatedId: Related ID is required" },
                    isUUID: { args: 4, msg: "relatedId: Must be a valid UUID" },
                },
            },
        }, {
            sequelize,
            modelName: "stakingAdminActivity",
            tableName: "staking_admin_activities",
            paranoid: true,
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "staking_admin_activities_action_idx",
                    fields: [{ name: "action" }],
                },
                {
                    name: "staking_admin_activities_type_idx",
                    fields: [{ name: "type" }],
                },
                {
                    name: "staking_admin_activities_relatedId_idx",
                    fields: [{ name: "relatedId" }],
                },
            ],
        });
    }
    static associate(models) {
        this.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingAdminActivity;
