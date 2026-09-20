"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class contentReport extends sequelize_1.Model {
    static initModel(sequelize) {
        return contentReport.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            reporterId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "reporterId cannot be null" },
                    isUUID: {
                        args: model_validators_1.ANY_UUID_VERSION,
                        msg: "reporterId must be a valid UUID",
                    },
                },
            },
            targetType: {
                type: sequelize_1.DataTypes.ENUM("BLOG_COMMENT", "BLOG_POST", "NFT_LISTING", "USER_PROFILE", "SUPPORT_TICKET"),
                allowNull: false,
            },
            targetId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "targetId cannot be null" },
                    isUUID: {
                        args: model_validators_1.ANY_UUID_VERSION,
                        msg: "targetId must be a valid UUID",
                    },
                },
            },
            targetOwnerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: {
                        args: model_validators_1.ANY_UUID_VERSION,
                        msg: "targetOwnerId must be a valid UUID",
                    },
                },
            },
            reason: {
                type: sequelize_1.DataTypes.ENUM("SPAM", "ABUSIVE_CONDUCT", "HATE_SPEECH", "SEXUAL_CONTENT", "VIOLENCE", "SCAM_OR_FRAUD", "IMPERSONATION", "OTHER"),
                allowNull: false,
            },
            details: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "A report must say what happened" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "REVIEWING", "ACTIONED", "DISMISSED"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            resolution: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            reviewedById: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: {
                        args: model_validators_1.ANY_UUID_VERSION,
                        msg: "reviewedById must be a valid UUID",
                    },
                },
            },
            reviewedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "contentReport",
            tableName: "content_reports",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "idx_content_report_status_createdAt",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "createdAt" }],
                },
                {
                    name: "idx_content_report_target",
                    using: "BTREE",
                    fields: [{ name: "targetType" }, { name: "targetId" }],
                },
                {
                    name: "idx_content_report_reporterId_createdAt",
                    using: "BTREE",
                    fields: [{ name: "reporterId" }, { name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        contentReport.belongsTo(models.user, {
            as: "reporter",
            foreignKey: "reporterId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        contentReport.belongsTo(models.user, {
            as: "targetOwner",
            foreignKey: "targetOwnerId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        contentReport.belongsTo(models.user, {
            as: "reviewedBy",
            foreignKey: "reviewedById",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = contentReport;
