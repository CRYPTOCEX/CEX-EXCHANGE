"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class rolePermission extends sequelize_1.Model {
    static initModel(sequelize) {
        return rolePermission.init({
            id: {
                type: sequelize_1.DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            roleId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: { model: "role", key: "id" },
            },
            permissionId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                references: { model: "permission", key: "id" },
            },
        }, {
            sequelize,
            modelName: "rolePermission",
            tableName: "role_permission",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "RolePermissionPermissionIdFkey",
                    using: "BTREE",
                    fields: [{ name: "permissionId" }],
                },
                {
                    name: "RolePermissionRoleIdFkey",
                    using: "BTREE",
                    fields: [{ name: "roleId" }],
                },
            ],
        });
    }
    static associate(models) {
        this.belongsTo(models.role, {
            as: "role",
            foreignKey: "roleId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        this.belongsTo(models.permission, {
            as: "permission",
            foreignKey: "permissionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = rolePermission;
