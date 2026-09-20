"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class stakingConsent extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingConsent.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: { notNull: { msg: "userId: User ID cannot be null" } },
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: { notNull: { msg: "poolId: Pool ID cannot be null" } },
            },
            activationId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            version: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                validate: { notEmpty: { msg: "version: Version must not be empty" } },
            },
            hash: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: false,
                validate: { notEmpty: { msg: "hash: Hash must not be empty" } },
            },
            text: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: false,
                validate: { notEmpty: { msg: "text: Disclosure text must not be empty" } },
            },
            acknowledgements: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            acceptedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            ip: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            userAgent: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingConsent",
            tableName: "staking_consents",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                { name: "staking_consents_user_idx", fields: [{ name: "userId" }] },
                { name: "staking_consents_pool_idx", fields: [{ name: "poolId" }] },
                { name: "staking_consents_version_idx", fields: [{ name: "version" }] },
            ],
        });
    }
    static associate(models) {
        stakingConsent.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingConsent.belongsTo(models.stakingPool, {
            foreignKey: "poolId",
            as: "pool",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingConsent.belongsTo(models.stakingChainActivation, {
            foreignKey: "activationId",
            as: "activation",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingConsent.hasMany(models.stakingPosition, {
            foreignKey: "consentId",
            as: "positions",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingConsent;
