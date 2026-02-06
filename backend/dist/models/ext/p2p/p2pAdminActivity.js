"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class p2pAdminActivity extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pAdminActivity.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            type: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "type: Activity type must not be empty" },
                },
            },
            relatedEntityId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "relatedEntityId cannot be null" },
                    isUUID: { args: 4, msg: "relatedEntityId must be a valid UUID" },
                },
            },
            relatedEntityName: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "relatedEntityName must not be empty" },
                },
            },
            adminId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "adminId cannot be null" },
                    isUUID: { args: 4, msg: "adminId must be a valid UUID" },
                },
            },
        }, {
            sequelize,
            modelName: "p2pAdminActivity",
            tableName: "p2p_admin_activity",
            timestamps: true,
            paranoid: true,
        });
    }
    static associate(models) {
        p2pAdminActivity.belongsTo(models.user, {
            as: "admin",
            foreignKey: "adminId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pAdminActivity;
