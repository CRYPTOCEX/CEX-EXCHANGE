import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class p2pPaymentMethod
  extends Model<p2pPaymentMethodAttributes, p2pPaymentMethodCreationAttributes>
  implements p2pPaymentMethodAttributes
{
  id!: string;
  userId?: string;
  /**
   * The RAIL this account is on — see `p2pPaymentRail`.
   *
   * Nullable, and it has to stay that way: rows predating rails carry null
   * until the repair script attaches them, and a rail that is deleted sets this
   * back to null rather than taking the trader's account details with it.
   * Everything that reads it treats null as "free-form, shape unknown", which is
   * exactly what those rows are.
   */
  railId?: string;
  name!: string;
  icon!: string;
  description?: string;
  instructions?: string;
  metadata?: Record<string, string>; // Flexible key-value pairs for payment details (e.g., "PayPal Email": "user@example.com")
  processingTime?: string;
  fees?: string;
  available!: boolean;
  isGlobal!: boolean;
  popularityRank!: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof p2pPaymentMethod {
    return p2pPaymentMethod.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "buyerId must be a valid UUID" },
          },
        },
        railId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment:
            "The shared rail this account belongs to. Null for rows created before rails existed, and for a rail that has since been deleted.",
        },
        /**
         * MIRRORS THE RAIL'S NAME, and is kept rather than derived.
         *
         * Every existing consumer — the offer chips, the trade snapshot, the
         * admin list — reads `name` off this row, and a trade's payment details
         * are frozen at initiation. Deriving the name through a join would make
         * renaming a rail rewrite the label on trades that already settled.
         */
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: { msg: "Payment method name must not be empty" },
          },
        },
        icon: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: { notEmpty: { msg: "Icon URL must not be empty" } },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        instructions: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "Flexible key-value pairs for payment details (e.g., PayPal Email, Bank Account, etc.)",
          get() {
            const rawValue = this.getDataValue("metadata" as keyof p2pPaymentMethodAttributes);
            if (!rawValue) return null;
            if (typeof rawValue === "string") {
              try {
                return JSON.parse(rawValue);
              } catch {
                return null;
              }
            }
            return rawValue;
          },
        },
        processingTime: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        fees: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        available: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        isGlobal: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "If true, this payment method is available to all users (created by admin)",
        },
        popularityRank: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: "p2pPaymentMethod",
        tableName: "p2p_payment_methods",
        timestamps: true,
        paranoid: true,
      }
    );
  }

  public static associate(models: any) {
    // Many-to-many with p2pOffer via the join table p2p_offer_payment_method
    p2pPaymentMethod.belongsToMany(models.p2pOffer, {
      through: "p2p_offer_payment_method",
      as: "offers",
      foreignKey: "paymentMethodId",
      otherKey: "offerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    
    // The shared rail this account is on.
    p2pPaymentMethod.belongsTo(models.p2pPaymentRail, {
      as: "rail",
      foreignKey: "railId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    // Belongs to user (optional - null for system/global methods)
    p2pPaymentMethod.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
