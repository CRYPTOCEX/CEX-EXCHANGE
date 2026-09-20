"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
function vmAddressValidator(field, optional) {
    return function (value) {
        var _a;
        if (optional && (value === null || value === undefined || value === ""))
            return;
        if (!(0, units_1.isAddressValidForVm)(this === null || this === void 0 ? void 0 : this.vm, String(value !== null && value !== void 0 ? value : ""))) {
            throw new Error(`dexQuote.${field} is not a valid ${(_a = this === null || this === void 0 ? void 0 : this.vm) !== null && _a !== void 0 ? _a : "EVM"} address`);
        }
    };
}
class dexQuote extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexQuote.init({
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
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
            },
            pairId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "NULL for an ad-hoc token combination that is not a curated market",
            },
            sellTokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            buyTokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            vm: {
                type: sequelize_1.DataTypes.STRING(8),
                allowNull: false,
                defaultValue: "EVM",
                validate: { isIn: [[...units_1.DEX_VM_VALUES]] },
                comment: "Decides address encoding and whether lowercasing an address destroys it. Denormalised because a validator runs inside the model, where the chain registry is a boot-time import cycle",
            },
            sellTokenAddress: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: false,
                validate: { addressMatchesVm: vmAddressValidator("sellTokenAddress", false) },
                set(value) {
                    this.setDataValue("sellTokenAddress", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "Denormalised so the row still reads correctly if the token row is removed. EVM: lowercase. SVM/TVM/TON: VERBATIM — case is data",
            },
            buyTokenAddress: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: false,
                validate: { addressMatchesVm: vmAddressValidator("buyTokenAddress", false) },
                set(value) {
                    this.setDataValue("buyTokenAddress", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "Denormalised so the row still reads correctly if the token row is removed",
            },
            sellAmountRaw: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: false,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "Base units as a decimal string — uint256 needs 78 digits, DECIMAL caps at 65",
            },
            buyAmountRaw: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: false,
                validate: { is: units_1.RAW_AMOUNT_RE },
            },
            minBuyAmountRaw: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: false,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "What the router itself will enforce — the slippage floor encoded in the calldata",
            },
            sellAmountDisplay: {
                type: sequelize_1.DataTypes.DECIMAL(38, 18),
                allowNull: false,
                get() {
                    const v = this.getDataValue("sellAmountDisplay");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            buyAmountDisplay: {
                type: sequelize_1.DataTypes.DECIMAL(38, 18),
                allowNull: false,
                get() {
                    const v = this.getDataValue("buyAmountDisplay");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            sellUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("sellUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "USD snapshot at quote time — display/aggregation only, LOSSY",
            },
            buyUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("buyUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "USD snapshot at quote time — display/aggregation only, LOSSY",
            },
            takerAddress: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: false,
                validate: { addressMatchesVm: vmAddressValidator("takerAddress", false) },
                set(value) {
                    this.setDataValue("takerAddress", (0, units_1.normalizeChainAddressValue)(value));
                },
            },
            takerVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Whether takerAddress was a PROVED wallet link at quote time - a providerUser row with provider WALLET, which is what the SIWE and non-EVM link proofs write. Stored rather than joined because a later verification must not retroactively make an unverified quote look verified. It said dexWalletLink until that table turned out to have no writer anywhere in the product",
            },
            aggregator: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                comment: 'dexProvider.name that produced this route. A DIRECT_POOL route writes "direct" here so Phase 4\'s analytics grouping does not break — but EVERY NEW CONSUMER READS venueKind',
            },
            venueKind: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "AGGREGATOR",
                validate: { isIn: [["AGGREGATOR", "DIRECT_POOL"]] },
                comment: "NOT NULL with a default, so every existing row stays valid with no compensating script — there is no migration system here and no `down`",
            },
            venueName: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "The AMM deployment key on a direct route, distinct from the `aggregator` column above",
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Which pool the calldata targets. SET NULL — the quote outlives a pool archive",
            },
            router: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: true,
                validate: { addressMatchesVm: vmAddressValidator("router", true) },
                set(value) {
                    this.setDataValue("router", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "The transaction `to` the user will sign against. On SVM this is the aggregator's PROGRAM id, on TON the router contract — the same role, a different encoding",
            },
            allowanceTarget: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: true,
                validate: { addressMatchesVm: vmAddressValidator("allowanceTarget", true) },
                set(value) {
                    this.setDataValue("allowanceTarget", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "Spender for the ERC20/TRC20 approval — often NOT the router. Always NULL on SVM and TON: neither has an allowance model, so a value here would be a nonsense the client would then ask the user to sign",
            },
            value: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: false,
                defaultValue: "0",
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "Native value in wei attached to the transaction — non-zero only when selling the native asset",
            },
            calldata: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
                comment: "The exact payload the user signs, and it is NOT hex on every VM: EVM hex calldata, SVM a base64 v0 transaction, TVM the JSON `triggersmartcontract` object, TON a base64 message BOC. LONGTEXT because multi-hop routes exceed 64 KB",
            },
            calldataHash: {
                type: sequelize_1.DataTypes.STRING(66),
                allowNull: true,
                validate: { is: units_1.TX_HASH_RE },
                set(value) {
                    this.setDataValue("calldataHash", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "Hash of `calldata` — the binding key the execute path verifies against. keccak256 on EVM, sha256 of the stored payload on every other VM; always rendered 0x + 64 hex",
            },
            quoteKey: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                comment: "sha256 of the normalised request — the dedup key for the quote-spam guard",
            },
            feeBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
            },
            feeRecipient: {
                type: sequelize_1.DataTypes.STRING(units_1.CHAIN_ADDRESS_COLUMN_WIDTH),
                allowNull: true,
                validate: { addressMatchesVm: vmAddressValidator("feeRecipient", true) },
                set(value) {
                    this.setDataValue("feeRecipient", (0, units_1.normalizeChainAddressValue)(value));
                },
                comment: "Where the integrator fee accrues. On SVM this is a TOKEN ACCOUNT for the fee mint, not a wallet — SPL fees can only arrive in an account that already exists for that mint",
            },
            feeSide: {
                type: sequelize_1.DataTypes.STRING(8),
                allowNull: true,
                validate: { isIn: [["SELL", "BUY"]] },
            },
            estimatedFeeAmountRaw: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
            },
            slippageBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
            },
            priceImpactBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            estimatedGas: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
            },
            latencyMs: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "Provider round-trip, fed to the quote-log analytics",
            },
            outcome: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                defaultValue: "OK",
                validate: { isIn: [["OK", "NO_ROUTE", "PROVIDER_ERROR", "RATE_LIMITED", "TIMEOUT"]] },
                comment: "Why there is or is not a route. Failed attempts are persisted too — a user complaining they could never get a quote is unanswerable otherwise",
            },
            routeSummary: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("routeSummary", typeof value === "string" ? value : JSON.stringify(value));
                },
                get() {
                    const v = this.getDataValue("routeSummary");
                    return typeof v === "string" ? JSON.parse(v) : (v !== null && v !== void 0 ? v : null);
                },
                comment: "Normalised hop list, with the untouched vendor payload preserved under .raw",
            },
            complianceSnapshot: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                set(value) {
                    this.setDataValue("complianceSnapshot", typeof value === "string" ? value : JSON.stringify(value));
                },
                get() {
                    const v = this.getDataValue("complianceSnapshot");
                    return typeof v === "string" ? JSON.parse(v) : (v !== null && v !== void 0 ? v : null);
                },
                comment: "Resolved country and the signal that produced it, KYC feature state, geo list version, token risk levels at quote time, settings version. A SNAPSHOT, never a join",
            },
            status: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "OPEN",
                validate: { isIn: [["OPEN", "USED", "EXPIRED", "CANCELLED"]] },
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            ipAddress: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "Sized for IPv6 — the geo decision recorded in complianceSnapshot derives from it",
            },
            userAgent: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "dexQuote",
            tableName: "dex_quote",
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
                    name: "dexQuoteCalldataHashKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "chainId" }, { name: "calldataHash" }],
                },
                {
                    name: "dexQuoteUserCreatedIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "createdAt" }],
                },
                {
                    name: "dexQuoteDedupIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "quoteKey" }, { name: "createdAt" }],
                },
                {
                    name: "dexQuoteExpiryIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "expiresAt" }],
                },
                {
                    name: "dexQuoteChainCreatedIdx",
                    using: "BTREE",
                    fields: [{ name: "chainId" }, { name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        dexQuote.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        dexQuote.belongsTo(models.dexPair, {
            as: "pair",
            foreignKey: "pairId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        dexQuote.belongsTo(models.dexToken, {
            as: "sellToken",
            foreignKey: "sellTokenId",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        dexQuote.belongsTo(models.dexToken, {
            as: "buyToken",
            foreignKey: "buyTokenId",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = dexQuote;
