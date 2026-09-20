"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class spotDepositIntent extends sequelize_1.Model {
    static initModel(sequelize) {
        return spotDepositIntent.init({
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
                comment: "The customer who declared the deposit",
            },
            walletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "The wallet the deposit lands in first: SPOT for hash_claim/amount_match, ECO for ecosystem_custody",
            },
            currency: { type: sequelize_1.DataTypes.STRING(191), allowNull: false },
            network: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: false,
                comment: "The exchange's network id for the rail (TRC20, ERC20, BEP20, ...), upper-cased",
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                comment: "The ecosystem chain the customer's own address is on (ecosystem_custody only)",
            },
            mode: {
                type: sequelize_1.DataTypes.ENUM("hash_claim", "amount_match", "ecosystem_custody"),
                allowNull: false,
                comment: "Decided at creation from the spotDepositMode setting and eligibility; never changes",
            },
            declaredAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "What the customer said they would send (hash_claim, amount_match)",
            },
            expectedAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "The exact amount to send: declared plus the uniqueness nudge (amount_match), declared (hash_claim), NULL (ecosystem_custody)",
            },
            address: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "The address the customer was shown: the exchange's for hash_claim/amount_match, their own for ecosystem_custody",
            },
            tag: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "Memo/tag shown with the address, if the rail needs one",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("OPEN", "MATCHED", "SWEEPING", "CREDITED", "EXPIRED", "CANCELLED", "FAILED", "REVIEW"),
                allowNull: false,
                defaultValue: "OPEN",
            },
            activeAmountKey: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "<currency>|<expectedAmount> while OPEN under amount_match, NULL otherwise. UNIQUE: the nudge's guarantee, enforced by the database and nowhere else. No rail in the key — the matcher searches per currency",
            },
            claimedTxid: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "The hash: pasted (hash_claim), found on the exchange (amount_match), or produced by the sweep (ecosystem_custody)",
            },
            matchedDepositId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "The exchange's own id/txid for the deposit once matched",
            },
            sweepTransactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "The platform-initiated ECO WITHDRAW row that moves the coins to the exchange (ecosystem_custody)",
            },
            spotTransactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "The SPOT DEPOSIT transaction row the intent was credited through",
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "review reason, exchange network id and address, sweep attempts and resweepAt, amounts seen, hash submissions",
                get() {
                    return parseJsonColumn(this.getDataValue("metadata"));
                },
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                comment: "OPEN past this instant becomes EXPIRED (60 minutes after creation); matching keeps running for 7 days",
            },
        }, {
            sequelize,
            modelName: "spotDepositIntent",
            tableName: "spot_deposit_intent",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "uq_spot_deposit_intent_activeAmountKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "activeAmountKey" }],
                },
                {
                    name: "idx_spot_deposit_intent_user_status",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "status" }],
                },
                {
                    name: "idx_spot_deposit_intent_currency_network_status",
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "network" }, { name: "status" }],
                },
                {
                    name: "idx_spot_deposit_intent_wallet_chain_status",
                    using: "BTREE",
                    fields: [{ name: "walletId" }, { name: "chain" }, { name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        spotDepositIntent.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        spotDepositIntent.belongsTo(models.wallet, {
            as: "wallet",
            foreignKey: "walletId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = spotDepositIntent;
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
