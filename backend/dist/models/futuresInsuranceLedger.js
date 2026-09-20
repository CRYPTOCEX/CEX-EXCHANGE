"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class futuresInsuranceLedger extends sequelize_1.Model {
    static initModel(sequelize) {
        return futuresInsuranceLedger.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: false,
                get() {
                    const raw = this.getDataValue("amount");
                    return raw === null || raw === undefined ? 0 : Number(raw);
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("CLEARING", "FEE_SHARE", "LIQUIDATION_SURPLUS", "DEFICIT", "ADL", "ADJUSTMENT"),
                allowNull: false,
            },
            shortfall: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: true,
                get() {
                    const raw = this.getDataValue("shortfall");
                    return raw === null || raw === undefined ? null : Number(raw);
                },
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            positionId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            markPrice: {
                type: sequelize_1.DataTypes.DECIMAL(30, 8),
                allowNull: true,
                get() {
                    const raw = this.getDataValue("markPrice");
                    return raw === null || raw === undefined ? null : Number(raw);
                },
            },
            description: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            sliceKey: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                defaultValue: "",
            },
        }, {
            sequelize,
            modelName: "futuresInsuranceLedger",
            tableName: "futures_insurance_ledger",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "futures_insurance_ledger_currency",
                    using: "BTREE",
                    fields: [{ name: "currency" }],
                },
                {
                    name: "futures_insurance_ledger_symbol",
                    using: "BTREE",
                    fields: [{ name: "symbol" }],
                },
                {
                    name: "futures_insurance_ledger_slice_once",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "positionId" }, { name: "type" }, { name: "sliceKey" }],
                },
            ],
        });
    }
}
exports.default = futuresInsuranceLedger;
