"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class stakingValidatorSet extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingValidatorSet.init({
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
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                    len: { args: [2, 191], msg: "name: Length must be between 2 and 191 characters" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "RETIRED"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: { args: [["ACTIVE", "RETIRED"]], msg: "status: Must be one of: ACTIVE, RETIRED" },
                },
            },
            policy: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            lastEvaluatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastEvaluation: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
            healthy: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingValidatorSet",
            tableName: "staking_validator_sets",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "staking_validator_sets_chain_network_idx",
                    fields: [{ name: "chain" }, { name: "network" }],
                },
                { name: "staking_validator_sets_status_idx", fields: [{ name: "status" }] },
            ],
        });
    }
    static associate(models) {
        stakingValidatorSet.hasMany(models.stakingValidator, {
            foreignKey: "validatorSetId",
            as: "validators",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingValidatorSet.hasMany(models.stakingPool, {
            foreignKey: "validatorSetId",
            as: "pools",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingValidatorSet.hasMany(models.stakingChainActivation, {
            foreignKey: "validatorSetId",
            as: "activations",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingValidatorSet;
