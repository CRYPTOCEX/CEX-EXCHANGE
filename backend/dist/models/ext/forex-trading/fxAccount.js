"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class fxAccount extends sequelize_1.Model {
    static initModel(sequelize) {
        return fxAccount.init({
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
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
                },
                comment: "Owner — accounts are ALWAYS created bound to a verified user (no claim-from-pool)",
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("DEMO", "LIVE"),
                allowNull: false,
                defaultValue: "DEMO",
                validate: {
                    isIn: {
                        args: [["DEMO", "LIVE"]],
                        msg: "type: Type must be either 'DEMO' or 'LIVE'",
                    },
                },
            },
            accountCurrency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: "USD",
                validate: {
                    notEmpty: { msg: "accountCurrency: Account currency must not be empty" },
                },
                comment: "FIXED at creation — never changes afterwards or the deals ledger re-denominates",
            },
            balance: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isFloat: { msg: "balance: Balance must be a number" },
                },
                comment: "Cash balance in accountCurrency. Reservation model: opening positions never moves it except commission; swaps settle daily; closes book realizedPnl",
            },
            equity: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                comment: "Denormalized balance + floating PnL (engine sweep refresh; ledger is truth)",
            },
            usedMargin: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                comment: "Denormalized hedged-netting margin reservation (engine sweep refresh)",
            },
            leverage: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
                validate: {
                    isInt: { msg: "leverage: Leverage must be an integer" },
                    min: { args: [1], msg: "leverage: Leverage must be >= 1" },
                },
                comment: "Account leverage knob (effectiveLeverage = min with group/instrument caps)",
            },
            marginMode: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: "HEDGING",
                validate: {
                    isIn: {
                        args: [["HEDGING", "NETTING"]],
                        msg: "marginMode: Must be HEDGING or NETTING",
                    },
                },
                comment: "HEDGING default (multiple independent positions per symbol); NETTING reserved",
            },
            groupId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "groupId: Must be a valid UUID" },
                },
                comment: "Account tier (margin call/stop-out thresholds, NBP, leverage cap)",
            },
            swapFree: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
                comment: "Islamic account — swaps skipped where the symbol group allows",
            },
            tradingEnabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: true,
                comment: "Admin kill-switch: false blocks new orders (closes still allowed)",
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            dailyWithdrawLimit: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 5000,
                validate: {
                    isFloat: { msg: "dailyWithdrawLimit: Must be a number" },
                    min: { args: [0], msg: "dailyWithdrawLimit: Must be positive" },
                },
            },
            monthlyWithdrawLimit: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 50000,
                validate: {
                    isFloat: { msg: "monthlyWithdrawLimit: Must be a number" },
                    min: { args: [0], msg: "monthlyWithdrawLimit: Must be positive" },
                },
            },
            dailyWithdrawn: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 0,
                validate: {
                    isFloat: { msg: "dailyWithdrawn: Must be a number" },
                    min: { args: [0], msg: "dailyWithdrawn: Must be positive" },
                },
            },
            monthlyWithdrawn: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                defaultValue: 0,
                validate: {
                    isFloat: { msg: "monthlyWithdrawn: Must be a number" },
                    min: { args: [0], msg: "monthlyWithdrawn: Must be positive" },
                },
            },
            lastWithdrawReset: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            metadata: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("metadata", value === null || value === undefined || typeof value === "string"
                        ? value
                        : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("metadata");
                    if (!value)
                        return null;
                    try {
                        return JSON.parse(value);
                    }
                    catch (_a) {
                        return value;
                    }
                },
                comment: "Guarded TEXT-JSON side-channel (never money fields). Known keys: riskAckAt — ISO timestamp of the per-account leveraged-trading risk-disclosure acknowledgment (fxTradingRiskWarningEnabled)",
            },
        }, {
            sequelize,
            modelName: "fxAccount",
            tableName: "fx_account",
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
                    name: "fxAccountUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "fxAccountUserIdTypeIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "type" }],
                },
                {
                    name: "fxAccountGroupIdIdx",
                    using: "BTREE",
                    fields: [{ name: "groupId" }],
                },
            ],
        });
    }
    static associate(models) {
        fxAccount.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        fxAccount.belongsTo(models.fxAccountGroup, {
            as: "group",
            foreignKey: "groupId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        fxAccount.hasMany(models.fxOrder, {
            as: "orders",
            foreignKey: "accountId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        fxAccount.hasMany(models.fxPosition, {
            as: "positions",
            foreignKey: "accountId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        fxAccount.hasMany(models.fxDeal, {
            as: "deals",
            foreignKey: "accountId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = fxAccount;
