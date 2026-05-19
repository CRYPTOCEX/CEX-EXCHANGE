"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class kycVerificationResult extends sequelize_1.Model {
    static initModel(sequelize) {
        return kycVerificationResult.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the verification result",
            },
            applicationId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "applicationId: Application ID cannot be null" },
                },
                comment: "ID of the KYC application this result belongs to",
            },
            serviceId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "serviceId: Service ID cannot be empty" },
                },
                comment: "ID of the verification service that generated this result",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("VERIFIED", "FAILED", "PENDING", "NOT_STARTED"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["VERIFIED", "FAILED", "PENDING", "NOT_STARTED"]],
                        msg: "status: Invalid status value",
                    },
                },
                comment: "Status of the verification process for this service",
            },
            score: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                validate: {
                    isFloat: { msg: "score: Must be a valid number" },
                    min: { args: [0], msg: "score: Cannot be negative" },
                },
                comment: "Verification confidence score provided by the service",
            },
            checks: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Detailed verification checks and their results",
            },
            documentVerifications: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Results of document verification checks",
            },
        }, {
            sequelize,
            modelName: "kycVerificationResult",
            tableName: "kyc_verification_result",
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
    static associate(models) {
        kycVerificationResult.belongsTo(models.kycApplication, {
            as: "application",
            foreignKey: "applicationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        kycVerificationResult.belongsTo(models.kycVerificationService, {
            as: "service",
            foreignKey: "serviceId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = kycVerificationResult;
