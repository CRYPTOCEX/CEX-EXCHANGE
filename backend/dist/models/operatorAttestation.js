"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class operatorAttestation extends sequelize_1.Model {
    static initModel(sequelize) {
        return operatorAttestation.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            moduleId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "moduleId cannot be empty" },
                },
            },
            countryCode: {
                type: sequelize_1.DataTypes.STRING(2),
                allowNull: false,
                validate: {
                    is: {
                        args: [/^[A-Z]{2}$/],
                        msg: "countryCode must be an ISO 3166-1 alpha-2 code, upper case",
                    },
                },
            },
            entityName: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: { notEmpty: { msg: "entityName cannot be empty" } },
            },
            regulator: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: { notEmpty: { msg: "regulator cannot be empty" } },
            },
            licenceNumber: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: { notEmpty: { msg: "licenceNumber cannot be empty" } },
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                validate: { notNull: { msg: "expiresAt cannot be null" } },
            },
            notes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "operatorAttestation",
            tableName: "operator_attestations",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "idx_attestation_module_country",
                    using: "BTREE",
                    fields: [{ name: "moduleId" }, { name: "countryCode" }],
                },
                {
                    name: "idx_attestation_expiresAt",
                    using: "BTREE",
                    fields: [{ name: "expiresAt" }],
                },
            ],
        });
    }
}
exports.default = operatorAttestation;
