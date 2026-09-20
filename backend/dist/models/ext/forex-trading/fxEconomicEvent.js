"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class fxEconomicEvent extends sequelize_1.Model {
    static initModel(sequelize) {
        return fxEconomicEvent.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            externalId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "Stable provider dedup key (<provider>:<hash>) — NULL for operator-authored MANUAL rows",
            },
            source: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: "PROVIDER",
                validate: {
                    isIn: {
                        args: [["PROVIDER", "MANUAL"]],
                        msg: "source: Must be PROVIDER or MANUAL",
                    },
                },
            },
            provider: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "Data provider name that supplied the row (NULL for MANUAL)",
            },
            eventTime: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                comment: "Scheduled release instant (UTC)",
            },
            country: {
                type: sequelize_1.DataTypes.STRING(8),
                allowNull: true,
                comment: "ISO country code of the releasing authority",
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(8),
                allowNull: true,
                comment: "Currency the release moves — drives the per-symbol filter",
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title must not be empty" },
                },
            },
            impact: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: "LOW",
                validate: {
                    isIn: {
                        args: [["LOW", "MEDIUM", "HIGH"]],
                        msg: "impact: Must be LOW, MEDIUM or HIGH",
                    },
                },
            },
            actual: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "Released value as published (string — units vary)",
            },
            forecast: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
            },
            previousValue: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "Prior release value (column name avoids Model.previous())",
            },
            unit: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: true,
                comment: "Visible to clients — lets an operator hide a bad row",
            },
        }, {
            sequelize,
            modelName: "fxEconomicEvent",
            tableName: "fx_economic_event",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "fxEconomicEventExternalIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "externalId" }],
                },
                {
                    name: "fxEconomicEventTimeIndex",
                    using: "BTREE",
                    fields: [{ name: "eventTime" }],
                },
                {
                    name: "fxEconomicEventCurrencyTimeIndex",
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "eventTime" }],
                },
            ],
        });
    }
}
exports.default = fxEconomicEvent;
