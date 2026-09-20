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
class stakingValidator extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingValidator.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            validatorSetId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: { notNull: { msg: "validatorSetId: Validator set ID cannot be null" } },
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "chain: Chain must not be empty" } },
            },
            voteAccount: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                validate: { notEmpty: { msg: "voteAccount: Vote account must not be empty" } },
            },
            identity: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            weight: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                validate: {
                    isInt: { msg: "weight: Must be an integer" },
                    min: { args: [1], msg: "weight: Must be at least 1" },
                },
            },
            commissionPercent: {
                type: sequelize_1.DataTypes.DECIMAL(10, 8),
                allowNull: true,
                get: decimalGetter("commissionPercent"),
            },
            mevCommissionPercent: {
                type: sequelize_1.DataTypes.DECIMAL(10, 8),
                allowNull: true,
                get: decimalGetter("mevCommissionPercent"),
            },
            asn: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "SUSPENDED", "REMOVED"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "SUSPENDED", "REMOVED"]],
                        msg: "status: Must be one of: ACTIVE, SUSPENDED, REMOVED",
                    },
                },
            },
            lastHealth: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            lastHealthAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            breach: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingValidator",
            tableName: "staking_validators",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "staking_validators_set_vote_key",
                    unique: true,
                    fields: [{ name: "validatorSetId" }, { name: "voteAccount" }],
                },
                { name: "staking_validators_status_idx", fields: [{ name: "status" }] },
            ],
        });
    }
    static associate(models) {
        stakingValidator.belongsTo(models.stakingValidatorSet, {
            foreignKey: "validatorSetId",
            as: "validatorSet",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingValidator.hasMany(models.stakingTranche, {
            foreignKey: "validatorId",
            as: "tranches",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingValidator;
