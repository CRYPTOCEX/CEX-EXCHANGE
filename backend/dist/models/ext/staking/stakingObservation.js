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
class stakingObservation extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingObservation.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: { notNull: { msg: "poolId: Pool ID cannot be null" } },
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "chain: Chain must not be empty" } },
            },
            window: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                validate: { notEmpty: { msg: "window: Window must not be empty" } },
            },
            epoch: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            observedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            valueBefore: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("valueBefore"),
            },
            valueAfter: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("valueAfter"),
            },
            grossReward: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("grossReward"),
            },
            commissionAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("commissionAmount"),
                validate: { min: { args: [0], msg: "commissionAmount: Cannot be negative" } },
            },
            commissionShares: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("commissionShares"),
                validate: { min: { args: [0], msg: "commissionShares: Cannot be negative" } },
            },
            netReward: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("netReward"),
            },
            sharePriceBefore: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("sharePriceBefore"),
            },
            sharePriceAfter: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("sharePriceAfter"),
            },
            totalShares: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("totalShares"),
            },
            positionsCredited: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            detail: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingObservation",
            tableName: "staking_observations",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "staking_observations_pool_window_key",
                    unique: true,
                    fields: [{ name: "poolId" }, { name: "window" }],
                },
                { name: "staking_observations_observed_at_idx", fields: [{ name: "observedAt" }] },
            ],
        });
    }
    static associate(models) {
        stakingObservation.belongsTo(models.stakingPool, {
            foreignKey: "poolId",
            as: "pool",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingObservation.hasMany(models.stakingEarningRecord, {
            foreignKey: "observationId",
            as: "earnings",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingObservation;
