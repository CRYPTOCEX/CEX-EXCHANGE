"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class poolBackingCurrency extends sequelize_1.Model {
    static initModel(sequelize) {
        return poolBackingCurrency.init({
            currency: {
                type: sequelize_1.DataTypes.STRING(191),
                primaryKey: true,
                allowNull: false,
            },
            capUsd: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "Per-currency override of poolBackingCapUsd: the most the open transfer obligations may reach, in USD, before an ECO -> SPOT transfer is refused",
            },
            thresholdUsd: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "Per-currency override of poolBackingThresholdUsd",
            },
            networkMap: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "ecosystem chain id -> the active exchange's network id, validated at reconciliation",
                get() {
                    return parseJsonColumn(this.getDataValue("networkMap"));
                },
            },
            lastResidual: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "The residual the last reconciliation saw, to measure the streak",
            },
            residualStreak: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: "Consecutive runs the residual held the same sign above tolerance",
            },
            drift: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "The persisted drift for this currency, once the streak was reached",
            },
            driftFirstSeenAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            driftAcknowledgedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            driftAcknowledgedBy: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            driftAcknowledgedAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "The drift as it stood when acknowledged; a drift that has since grown past it counts as unacknowledged again",
            },
            notes: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        }, {
            sequelize,
            modelName: "poolBackingCurrency",
            tableName: "pool_backing_currency",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "currency" }],
                },
            ],
        });
    }
    static associate(_models) {
    }
}
exports.default = poolBackingCurrency;
function parseJsonColumn(value) {
    if (value == null)
        return null;
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        }
        catch (_a) {
            return null;
        }
    }
    return value;
}
