"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoAdminActivity extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoAdminActivity.init({
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
            offeringId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "offeringId: Offering ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "offeringId: Offering ID must be a valid UUID",
                    },
                },
            },
            offeringName: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "offeringName: Offering name must not be empty" },
                },
            },
            adminId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "adminId: Admin ID cannot be null" },
                    isUUID: { args: 4, msg: "adminId: Admin ID must be a valid UUID" },
                },
            },
            details: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "icoAdminActivity",
            tableName: "ico_admin_activity",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "icoAdminActivityOfferingIdIdx",
                    fields: [{ name: "offeringId" }],
                },
                {
                    name: "icoAdminActivityAdminIdIdx",
                    fields: [{ name: "adminId" }],
                },
                {
                    name: "icoAdminActivityTypeIdx",
                    fields: [{ name: "type" }],
                },
            ],
        });
    }
    static associate(models) {
        icoAdminActivity.belongsTo(models.icoTokenOffering, {
            as: "offering",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        icoAdminActivity.belongsTo(models.user, {
            as: "admin",
            foreignKey: "adminId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = icoAdminActivity;
