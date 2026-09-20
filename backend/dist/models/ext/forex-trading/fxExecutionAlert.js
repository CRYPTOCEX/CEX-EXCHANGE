"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class fxExecutionAlert extends sequelize_1.Model {
    static initModel(sequelize) {
        return fxExecutionAlert.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            executionProviderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "fxExecutionProvider the alert concerns — NULL for global alerts",
            },
            alertKey: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "alertKey: Alert key must not be empty" },
                },
                comment: "Stable machine key (ledger-drift, hedge-margin, orphan, cursor-stall, …) — throttle dimension",
            },
            severity: {
                type: sequelize_1.DataTypes.STRING(12),
                allowNull: false,
                defaultValue: "warning",
                validate: {
                    isIn: {
                        args: [["info", "warning", "critical"]],
                        msg: "severity: Must be info, warning or critical",
                    },
                },
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title must not be empty" },
                },
                comment: "Human headline — also the notification/email subject",
            },
            message: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "message: Message must not be empty" },
                },
                comment: "Human body — also the notification/email message",
            },
            payload: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("payload", value === null || value === undefined || typeof value === "string"
                        ? value
                        : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("payload");
                    if (!value)
                        return null;
                    try {
                        return JSON.parse(value);
                    }
                    catch (_a) {
                        return value;
                    }
                },
                comment: "Structured context for the dashboard inbox (guarded TEXT-JSON)",
            },
            acknowledgedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
                comment: "Set when an operator acknowledges the alert in the inbox",
            },
        }, {
            sequelize,
            modelName: "fxExecutionAlert",
            tableName: "fx_execution_alert",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "fxExecutionAlertThrottleIdx",
                    using: "BTREE",
                    fields: [
                        { name: "executionProviderId" },
                        { name: "alertKey" },
                        { name: "createdAt" },
                    ],
                },
            ],
        });
    }
    static associate(models) {
        fxExecutionAlert.belongsTo(models.fxExecutionProvider, {
            as: "executionProvider",
            foreignKey: "executionProviderId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = fxExecutionAlert;
