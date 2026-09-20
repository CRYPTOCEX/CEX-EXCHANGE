"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const crypto_1 = require("crypto");
const model_validators_1 = require("@b/utils/model-validators");
class wallet extends sequelize_1.Model {
    static initModel(sequelize) {
        return wallet.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
                },
                comment: "ID of the user who owns this wallet",
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("FIAT", "SPOT", "ECO", "FUTURES", "COPY_TRADING"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["FIAT", "SPOT", "ECO", "FUTURES", "COPY_TRADING"]],
                        msg: "type: Type must be one of ['FIAT', 'SPOT', 'ECO', 'FUTURES', 'COPY_TRADING']",
                    },
                },
                comment: "Type of wallet (FIAT for fiat currencies, SPOT for spot trading, ECO for ecosystem, FUTURES for futures trading)",
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency cannot be empty" },
                },
                comment: "Currency symbol for this wallet (e.g., BTC, USD, ETH)",
            },
            balance: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isFloat: { msg: "balance: Balance must be a number" },
                },
                comment: "Available balance in this wallet",
            },
            inOrder: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                defaultValue: 0,
                comment: "Amount currently locked in open orders",
            },
            address: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const rawData = this.getDataValue("address");
                    if (!rawData)
                        return null;
                    if (typeof rawData === "string") {
                        try {
                            return JSON.parse(rawData);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return rawData;
                },
                set(value) {
                    if (value === null || value === undefined) {
                        this.setDataValue("address", undefined);
                        this.setDataValue("addressLookupKey", null);
                        return;
                    }
                    let parsed;
                    if (typeof value === "string") {
                        try {
                            parsed = JSON.parse(value);
                        }
                        catch (_a) {
                            parsed = null;
                        }
                        this.setDataValue("address", (parsed !== null && parsed !== void 0 ? parsed : value));
                    }
                    else {
                        this.setDataValue("address", value);
                        parsed = value;
                    }
                    let firstAddr;
                    if (parsed && typeof parsed === "object") {
                        const first = Object.values(parsed)[0];
                        if (first && typeof first.address === "string") {
                            firstAddr = first.address;
                        }
                    }
                    if (firstAddr) {
                        const hash = (0, crypto_1.createHash)("sha256").update(firstAddr).digest("hex");
                        this.setDataValue("addressLookupKey", hash);
                    }
                    else {
                        this.setDataValue("addressLookupKey", null);
                    }
                },
                comment: "Blockchain addresses associated with this wallet",
            },
            addressLookupKey: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "SHA256 hash of primary blockchain address for O(1) lookup",
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean" },
                },
                comment: "Whether this wallet is active and usable",
            },
        }, {
            sequelize,
            modelName: "wallet",
            tableName: "wallet",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "walletUserIdCurrencyTypeKey",
                    unique: true,
                    using: "BTREE",
                    fields: [
                        { name: "userId" },
                        { name: "currency" },
                        { name: "type" },
                    ],
                },
                {
                    name: "walletAddressLookupKey",
                    unique: false,
                    using: "BTREE",
                    fields: [{ name: "addressLookupKey" }],
                },
                {
                    name: "idx_wallet_deletedAt_createdAt",
                    using: "BTREE",
                    fields: [{ name: "deletedAt" }, { name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        wallet.hasMany(models.ecosystemPrivateLedger, {
            as: "ecosystemPrivateLedgers",
            foreignKey: "walletId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        wallet.hasMany(models.ecosystemUtxo, {
            as: "ecosystemUtxos",
            foreignKey: "walletId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        wallet.hasMany(models.transaction, {
            as: "transactions",
            foreignKey: "walletId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        wallet.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        wallet.hasMany(models.walletData, {
            as: "walletData",
            foreignKey: "walletId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = wallet;
