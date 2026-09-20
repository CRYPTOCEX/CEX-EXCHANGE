"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
const json_column_1 = require("@b/utils/json-column");
class p2pDispute extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pDispute.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            tradeId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "tradeId is required" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "tradeId must be a valid UUID" },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "amount must not be empty" } },
            },
            reportedById: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "reportedById is required" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "reportedById must be a valid UUID" },
                },
            },
            againstId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "againstId is required" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "againstId must be a valid UUID" },
                },
            },
            reason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: { notEmpty: { msg: "reason must not be empty" } },
            },
            details: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            filedOn: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: { args: true, msg: "filedOn must be a valid date" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "IN_PROGRESS", "RESOLVED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "IN_PROGRESS", "RESOLVED"]],
                        msg: "Invalid dispute status",
                    },
                },
            },
            priority: {
                type: sequelize_1.DataTypes.ENUM("HIGH", "MEDIUM", "LOW"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["HIGH", "MEDIUM", "LOW"]],
                        msg: "Invalid priority",
                    },
                },
            },
            resolution: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    return (0, json_column_1.readJsonObjectColumn)(this.getDataValue("resolution"));
                },
            },
            resolvedOn: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            messages: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    return (0, json_column_1.readJsonArrayColumn)(this.getDataValue("messages"));
                },
            },
            evidence: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    return (0, json_column_1.readJsonArrayColumn)(this.getDataValue("evidence"));
                },
            },
            activityLog: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    return (0, json_column_1.readJsonArrayColumn)(this.getDataValue("activityLog"));
                },
            },
            appealedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "When the trader this dispute was filed against formally contested it. Null means uncontested, which is not the same as agreed.",
            },
            appealedById: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "appealedById must be a valid UUID" },
                },
                comment: "Who appealed. Always equal to againstId today; stored explicitly so the record does not depend on that staying true.",
            },
            appealStatement: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "The respondent's account of what happened, in their own words.",
            },
        }, {
            sequelize,
            modelName: "p2pDispute",
            tableName: "p2p_disputes",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "idx_p2p_dispute_status_appealedAt",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "appealedAt" }],
                },
            ],
        });
    }
    static associate(models) {
        p2pDispute.belongsTo(models.p2pTrade, {
            as: "trade",
            foreignKey: "tradeId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pDispute.belongsTo(models.user, {
            as: "reportedBy",
            foreignKey: "reportedById",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pDispute.belongsTo(models.user, {
            as: "against",
            foreignKey: "againstId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pDispute.belongsTo(models.user, {
            as: "appealedBy",
            foreignKey: "appealedById",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pDispute;
