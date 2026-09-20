"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class transfiIban extends sequelize_1.Model {
    static initModel(sequelize) {
        return transfiIban.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: { isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: must be a valid UUID" } },
            },
            ibId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                unique: "transfiIbanIbIdKey",
            },
            transfiUserId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
            },
            iban: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                unique: "transfiIbanIbanKey",
            },
            bic: { type: sequelize_1.DataTypes.STRING(32), allowNull: true },
            accountNumber: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
            bankName: { type: sequelize_1.DataTypes.STRING(191), allowNull: true },
            bankAddress: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
            accountHolderName: { type: sequelize_1.DataTypes.STRING(191), allowNull: true },
            status: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                defaultValue: "ACTIVE",
            },
            lastSyncedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        }, {
            sequelize,
            modelName: "transfiIban",
            tableName: "transfi_iban",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "transfiIbanUserCurrencyKey",
                    unique: true,
                    fields: [{ name: "userId" }, { name: "currency" }],
                },
                { name: "transfiIbanIbIdKey", unique: true, fields: [{ name: "ibId" }] },
                { name: "transfiIbanIbanKey", unique: true, fields: [{ name: "iban" }] },
            ],
        });
    }
    static associate(models) {
        transfiIban.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = transfiIban;
