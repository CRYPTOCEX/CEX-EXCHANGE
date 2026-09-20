"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class p2pUserReport extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pUserReport.init({
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
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "reporterId must be a valid UUID" },
                },
            },
            reportedId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "reportedId cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "reportedId must be a valid UUID" },
                },
            },
            tradeId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "tradeId must be a valid UUID" },
                },
            },
            reason: {
                type: sequelize_1.DataTypes.ENUM("PAYMENT_OUTSIDE_PLATFORM", "THIRD_PARTY_PAYMENT", "ABUSIVE_CONDUCT", "CONTACT_DETAILS_IN_ADVERT", "SUSPECTED_FRAUD", "IMPERSONATION", "OTHER"),
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
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "reviewedById must be a valid UUID" },
                },
            },
            reviewedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "p2pUserReport",
            tableName: "p2p_user_reports",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "idx_p2p_report_status_createdAt",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "createdAt" }],
                },
                {
                    name: "idx_p2p_report_reportedId",
                    using: "BTREE",
                    fields: [{ name: "reportedId" }],
                },
                {
                    name: "idx_p2p_report_reporterId_createdAt",
                    using: "BTREE",
                    fields: [{ name: "reporterId" }, { name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        p2pUserReport.belongsTo(models.user, {
            as: "reporter",
            foreignKey: "reporterId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pUserReport.belongsTo(models.user, {
            as: "reported",
            foreignKey: "reportedId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pUserReport.belongsTo(models.p2pTrade, {
            as: "trade",
            foreignKey: "tradeId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        p2pUserReport.belongsTo(models.user, {
            as: "reviewedBy",
            foreignKey: "reviewedById",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pUserReport;
