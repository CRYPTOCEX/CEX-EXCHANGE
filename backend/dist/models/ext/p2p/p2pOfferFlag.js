"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class p2pOfferFlag extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pOfferFlag.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            offerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "offerId must be a valid UUID" },
                },
            },
            flaggedById: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "flaggedById must be a valid UUID" },
                },
            },
            isFlagged: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            reason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            flaggedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        }, {
            sequelize,
            modelName: "p2pOfferFlag",
            tableName: "p2p_offer_flags",
            timestamps: true,
            paranoid: true,
        });
    }
    static associate(models) {
        p2pOfferFlag.belongsTo(models.p2pOffer, {
            as: "offer",
            foreignKey: "offerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pOfferFlag.belongsTo(models.user, {
            as: "flaggedBy",
            foreignKey: "flaggedById",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pOfferFlag;
