"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoTokenOfferingPhase extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoTokenOfferingPhase.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            offeringId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "offeringId: Offering ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "offeringId: Offering ID must be a valid UUID",
                    },
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Phase name must not be empty" },
                },
            },
            tokenPrice: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    isFloat: { msg: "tokenPrice: Must be a valid number" },
                    min: { args: [0], msg: "tokenPrice: Cannot be negative" },
                },
            },
            allocation: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    isFloat: { msg: "allocation: Must be a valid number" },
                    min: { args: [0], msg: "allocation: Cannot be negative" },
                },
            },
            remaining: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                validate: {
                    isFloat: { msg: "remaining: Must be a valid number" },
                    min: { args: [0], msg: "remaining: Cannot be negative" },
                },
            },
            duration: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: { msg: "duration: Must be an integer" },
                    min: { args: [0], msg: "duration: Cannot be negative" },
                },
            },
            sequence: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "sequence: Must be an integer" },
                    min: { args: [0], msg: "sequence: Cannot be negative" },
                },
            },
            startDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            endDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "icoTokenOfferingPhase",
            tableName: "ico_token_offering_phase",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "icoTokenOfferingPhaseOfferingIdNameKey",
                    unique: true,
                    fields: [{ name: "offeringId" }, { name: "name" }],
                },
            ],
        });
    }
    static associate(models) {
        icoTokenOfferingPhase.belongsTo(models.icoTokenOffering, {
            as: "offering",
            foreignKey: "offeringId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = icoTokenOfferingPhase;
