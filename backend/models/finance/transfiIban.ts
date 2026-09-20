import { DataTypes, Model, Sequelize } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * A virtual IBAN issued to a customer by TransFi.
 *
 * Permanent bank details the customer can pay into at any time, instead of
 * starting a checkout for every deposit. Inbound funds land against the IBAN and
 * are attributed to an order via `POST /v3/orders/link`.
 *
 * Stored locally because the IBAN, BIC and account number are what the customer
 * needs to see on every visit, and because `POST /v3/iban/create-iban` is not
 * idempotent — calling it again would issue a SECOND IBAN for the same person
 * rather than returning the existing one. The unique index on (userId, currency)
 * is what prevents that.
 */
export default class transfiIban
  extends Model<transfiIbanAttributes, transfiIbanCreationAttributes>
  implements transfiIbanAttributes
{
  id!: string;
  userId!: string;
  /** TransFi's identifier, e.g. IBAN--260801235153446. */
  ibId!: string;
  /** The TransFi payer this IBAN belongs to (UX-...). */
  transfiUserId!: string;
  currency!: string;
  iban!: string;
  bic?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  bankAddress?: string | null;
  accountHolderName?: string | null;
  /** TransFi's own status, verbatim (e.g. ACTIVE). */
  status!: string;
  lastSyncedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize): typeof transfiIban {
    return transfiIban.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: { isUUID: { args: ANY_UUID_VERSION, msg: "userId: must be a valid UUID" } },
        },
        ibId: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: "transfiIbanIbIdKey",
        },
        transfiUserId: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
        },
        iban: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: "transfiIbanIbanKey",
        },
        bic: { type: DataTypes.STRING(32), allowNull: true },
        accountNumber: { type: DataTypes.STRING(64), allowNull: true },
        bankName: { type: DataTypes.STRING(191), allowNull: true },
        bankAddress: { type: DataTypes.STRING(500), allowNull: true },
        accountHolderName: { type: DataTypes.STRING(191), allowNull: true },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: "ACTIVE",
        },
        lastSyncedAt: { type: DataTypes.DATE, allowNull: true },
      },
      {
        sequelize,
        modelName: "transfiIban",
        tableName: "transfi_iban",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            // One IBAN per customer per currency. Creation is NOT idempotent
            // upstream, so this index is the thing that stops a second call
            // issuing a duplicate account.
            name: "transfiIbanUserCurrencyKey",
            unique: true,
            fields: [{ name: "userId" }, { name: "currency" }],
          },
          { name: "transfiIbanIbIdKey", unique: true, fields: [{ name: "ibId" }] },
          { name: "transfiIbanIbanKey", unique: true, fields: [{ name: "iban" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    transfiIban.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
