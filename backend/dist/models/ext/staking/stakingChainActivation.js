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
class stakingChainActivation extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingChainActivation.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "chain: Chain must not be empty" } },
            },
            network: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                validate: { notEmpty: { msg: "network: Network must not be empty" } },
            },
            venue: {
                type: sequelize_1.DataTypes.ENUM("SOLANA_NATIVE", "LIDO_STETH"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["SOLANA_NATIVE", "LIDO_STETH"]],
                        msg: "venue: Must be one of: SOLANA_NATIVE, LIDO_STETH",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("DRAFT", "ACTIVE", "PAUSED", "RETIRED"),
                allowNull: false,
                defaultValue: "DRAFT",
                validate: {
                    isIn: {
                        args: [["DRAFT", "ACTIVE", "PAUSED", "RETIRED"]],
                        msg: "status: Must be one of: DRAFT, ACTIVE, PAUSED, RETIRED",
                    },
                },
            },
            stakingWalletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            validatorSetId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            defaultCommissionPercent: {
                type: sequelize_1.DataTypes.DECIMAL(10, 8),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("defaultCommissionPercent"),
                validate: {
                    min: { args: [0], msg: "defaultCommissionPercent: Cannot be negative" },
                    max: { args: [100], msg: "defaultCommissionPercent: Cannot exceed 100%" },
                },
            },
            commissionNoticeDays: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 30,
                validate: {
                    isInt: { msg: "commissionNoticeDays: Must be an integer" },
                    min: { args: [0], msg: "commissionNoticeDays: Cannot be negative" },
                },
            },
            slashingPolicy: {
                type: sequelize_1.DataTypes.ENUM("PASS_THROUGH", "REIMBURSE_CAPPED"),
                allowNull: false,
                defaultValue: "PASS_THROUGH",
                validate: {
                    isIn: {
                        args: [["PASS_THROUGH", "REIMBURSE_CAPPED"]],
                        msg: "slashingPolicy: Must be one of: PASS_THROUGH, REIMBURSE_CAPPED",
                    },
                },
            },
            slashingReimburseCap: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("slashingReimburseCap"),
            },
            licensed: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            regulator: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            licenceReference: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            jurisdictionsServed: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            ringFenceAcknowledged: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            noGuaranteeAcknowledged: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            validatorDueDiligence: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            sfcAttestation: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            disclosureVersion: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            disclosureHash: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: true,
            },
            disclosureText: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
            acceptedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            acceptedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            acceptedIp: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            acceptedUserAgent: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
            activatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            pausedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            pausedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            pausedReason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            retiredAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            createdBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingChainActivation",
            tableName: "staking_chain_activations",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "staking_chain_activations_chain_network_key",
                    unique: true,
                    fields: [{ name: "chain" }, { name: "network" }],
                },
                { name: "staking_chain_activations_status_idx", fields: [{ name: "status" }] },
            ],
        });
    }
    static associate(models) {
        stakingChainActivation.belongsTo(models.stakingChainWallet, {
            foreignKey: "stakingWalletId",
            as: "stakingWallet",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingChainActivation.belongsTo(models.stakingValidatorSet, {
            foreignKey: "validatorSetId",
            as: "validatorSet",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        stakingChainActivation.hasMany(models.stakingPool, {
            foreignKey: "activationId",
            as: "pools",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingChainActivation.hasMany(models.stakingConsent, {
            foreignKey: "activationId",
            as: "consents",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingChainActivation;
