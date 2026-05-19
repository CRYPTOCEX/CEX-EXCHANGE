"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class kycVerificationService extends sequelize_1.Model {
    static initModel(sequelize) {
        return kycVerificationService.init({
            id: {
                type: sequelize_1.DataTypes.STRING,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the verification service provider",
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name cannot be empty" },
                },
                comment: "Display name of the verification service provider",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description cannot be empty" },
                },
                comment: "Description of the verification service and its capabilities",
            },
            type: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "type: Type cannot be empty" },
                },
                comment: "Type of verification service (e.g., 'document', 'identity', 'address')",
            },
            integrationDetails: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                comment: "Configuration and API details for integrating with the service",
            },
        }, {
            sequelize,
            modelName: "kycVerificationService",
            tableName: "kyc_verification_service",
            timestamps: true,
            paranoid: false,
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
    static associate(models) {
        kycVerificationService.hasMany(models.kycVerificationResult, {
            as: "verificationResults",
            foreignKey: "serviceId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        kycVerificationService.hasMany(models.kycLevel, {
            as: "levels",
            foreignKey: "serviceId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = kycVerificationService;
