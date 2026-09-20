"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class transfiRecipient extends sequelize_1.Model {
    static initModel(sequelize) {
        return transfiRecipient.init({
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
            transfiRecipientId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                validate: {
                    is: {
                        args: /^UX-[A-Za-z0-9]+$/,
                        msg: "transfiRecipientId: must be a TransFi id of the form UX-...",
                    },
                },
            },
            firstName: { type: sequelize_1.DataTypes.STRING(191), allowNull: false },
            lastName: { type: sequelize_1.DataTypes.STRING(191), allowNull: false },
            country: {
                type: sequelize_1.DataTypes.STRING(2),
                allowNull: false,
                validate: { len: { args: [2, 2], msg: "country: must be a 2-letter code" } },
            },
            accountType: {
                type: sequelize_1.DataTypes.ENUM("bank_account", "iban", "e_wallet", "mobile_wallet"),
                allowNull: false,
            },
            accountValue: { type: sequelize_1.DataTypes.STRING(191), allowNull: false },
            currency: { type: sequelize_1.DataTypes.STRING(10), allowNull: true },
            label: { type: sequelize_1.DataTypes.STRING(191), allowNull: true },
            fingerprint: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                comment: "sha256 of the identifying fields; unique per user",
            },
            lastUsedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        }, {
            sequelize,
            modelName: "transfiRecipient",
            tableName: "transfi_recipient",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "transfiRecipientUserFingerprintKey",
                    unique: true,
                    fields: [{ name: "userId" }, { name: "fingerprint" }],
                },
                {
                    name: "transfiRecipientIdKey",
                    unique: true,
                    fields: [{ name: "transfiRecipientId" }],
                },
                { name: "transfiRecipientUserIdIdx", fields: [{ name: "userId" }] },
            ],
        });
    }
    static associate(models) {
        transfiRecipient.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = transfiRecipient;
