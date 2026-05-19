"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class p2pOfferPaymentMethod extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pOfferPaymentMethod.init({
            offerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            paymentMethodId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
        }, {
            sequelize,
            modelName: "p2pOfferPaymentMethod",
            tableName: "p2p_offer_payment_method",
            timestamps: false,
        });
    }
    static associate(models) {
    }
}
exports.default = p2pOfferPaymentMethod;
