"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
function decimalGetter(field) {
    return function () {
        const raw = this.getDataValue(field);
        if (raw === null || raw === undefined)
            return raw;
        const n = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(n) ? n : 0;
    };
}
class stakingIncident extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingIncident.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
            },
            kind: {
                type: sequelize_1.DataTypes.ENUM("SLASHING", "DRIFT", "LOW_GAS", "VALIDATOR_BREACH", "BATCH_STUCK", "OBSERVER_LAG", "UNBONDING_OVERDUE", "DELEGATION_STALE", "COMMISSION", "OTHER"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [
                            ["SLASHING", "DRIFT", "LOW_GAS", "VALIDATOR_BREACH", "BATCH_STUCK", "OBSERVER_LAG", "UNBONDING_OVERDUE", "DELEGATION_STALE", "COMMISSION", "OTHER"],
                        ],
                        msg: "kind: Must be a known incident kind",
                    },
                },
            },
            severity: {
                type: sequelize_1.DataTypes.ENUM("INFO", "WARNING", "CRITICAL"),
                allowNull: false,
                defaultValue: "WARNING",
                validate: {
                    isIn: {
                        args: [["INFO", "WARNING", "CRITICAL"]],
                        msg: "severity: Must be one of: INFO, WARNING, CRITICAL",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("OPEN", "ACKNOWLEDGED", "RESOLVED"),
                allowNull: false,
                defaultValue: "OPEN",
                validate: {
                    isIn: {
                        args: [["OPEN", "ACKNOWLEDGED", "RESOLVED"]],
                        msg: "status: Must be one of: OPEN, ACKNOWLEDGED, RESOLVED",
                    },
                },
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: { notEmpty: { msg: "title: Title must not be empty" } },
            },
            detail: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
            lossAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("lossAmount"),
            },
            reimbursedAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("reimbursedAmount"),
                validate: { min: { args: [0], msg: "reimbursedAmount: Cannot be negative" } },
            },
            dedupeKey: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: { notEmpty: { msg: "dedupeKey: Dedupe key must not be empty" } },
            },
            occurrences: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            firstSeenAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            lastSeenAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            acknowledgedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            acknowledgedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            resolvedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            resolvedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            resolution: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingIncident",
            tableName: "staking_incidents",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                { name: "staking_incidents_status_severity_idx", fields: [{ name: "status" }, { name: "severity" }] },
                { name: "staking_incidents_dedupe_idx", fields: [{ name: "dedupeKey" }, { name: "status" }] },
                { name: "staking_incidents_pool_idx", fields: [{ name: "poolId" }] },
            ],
        });
    }
    static associate(models) {
        stakingIncident.belongsTo(models.stakingPool, {
            foreignKey: "poolId",
            as: "pool",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingIncident;
