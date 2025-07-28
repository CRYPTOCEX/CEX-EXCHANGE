import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface p2pOfferPaymentMethodAttributes {
  offerId: string;
  paymentMethodId: string;
}

export default class p2pOfferPaymentMethod
  extends Model<p2pOfferPaymentMethodAttributes>
  implements p2pOfferPaymentMethodAttributes
{
  offerId!: string;
  paymentMethodId!: string;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof p2pOfferPaymentMethod {
    return p2pOfferPaymentMethod.init(
      {
        offerId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        paymentMethodId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: "p2pOfferPaymentMethod",
        tableName: "p2p_offer_payment_method",
        timestamps: false,
      }
    );
  }

  public static associate(models: any) {
    // Associations are defined in p2pPaymentMethod and p2pOffer models.
  }
}
