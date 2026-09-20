"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
class dexWalletLink extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexWalletLink.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            vm: {
                type: sequelize_1.DataTypes.STRING(8),
                allowNull: false,
                defaultValue: "EVM",
                validate: { isIn: [[...units_1.DEX_VM_VALUES]] },
            },
            address: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: false,
                validate: {
                    addressMatchesVm(value) {
                        var _a;
                        if (!(0, units_1.isAddressValidForVm)(this.vm, String(value !== null && value !== void 0 ? value : ""))) {
                            throw new Error(`dexWalletLink.address is not a valid ${(_a = this.vm) !== null && _a !== void 0 ? _a : "EVM"} address`);
                        }
                    },
                },
                set(value) {
                    this.setDataValue("address", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "The self-custody address the user proved control of. EVM: lowercase. SVM/TVM/TON: verbatim — folding base58 or base64 names a different account, and this column is compared against a signer read from the chain",
            },
            label: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "Operator- or user-supplied name, display only",
            },
            verifiedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "NULL means the address was seen but never proven — treat it as unverified",
            },
            verificationMethod: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: true,
                validate: { isIn: [["SIWE", "APPKIT"]] },
            },
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "The chain the SIWE message named — part of what was signed, so it is recorded as signed",
            },
            lastUsedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            nonce: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "In-flight SIWE challenge, cleared on verification",
            },
            nonceExpiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "dexWalletLink",
            tableName: "dex_wallet_link",
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
                    name: "dexWalletLinkAddressKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "address" }],
                },
                {
                    name: "dexWalletLinkUserIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        dexWalletLink.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = dexWalletLink;
