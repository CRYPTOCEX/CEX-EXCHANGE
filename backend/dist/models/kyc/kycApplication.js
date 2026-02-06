"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const init_1 = require("../init");
class kycApplication extends sequelize_1.Model {
    static initModel(sequelize) {
        return kycApplication.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the KYC application",
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                },
                comment: "ID of the user submitting the KYC application",
            },
            levelId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "levelId: Level ID cannot be null" },
                },
                comment: "ID of the KYC level being applied for",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "ADDITIONAL_INFO_REQUIRED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [
                            ["PENDING", "APPROVED", "REJECTED", "ADDITIONAL_INFO_REQUIRED"],
                        ],
                        msg: "status: Invalid status value",
                    },
                },
                comment: "Current status of the KYC application review process",
            },
            data: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
                comment: "KYC application data including documents and personal information",
            },
            adminNotes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Notes added by admin during KYC review process",
            },
            reviewedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Date and time when the application was reviewed by admin",
            },
        }, {
            sequelize,
            modelName: "kycApplication",
            tableName: "kyc_application",
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
            hooks: {
                ...(0, init_1.createUserCacheHooks)(),
            },
        });
    }
    static associate(models) {
        kycApplication.belongsTo(models.kycLevel, {
            as: "level",
            foreignKey: "levelId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        kycApplication.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        kycApplication.hasOne(models.kycVerificationResult, {
            as: "verificationResult",
            foreignKey: "applicationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = kycApplication;
