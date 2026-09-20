import { DataTypes, Model, Sequelize } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * A payout beneficiary registered with TransFi.
 *
 * `POST /v3/recipients/individual` returns a `UX-` id and there is **no
 * list-recipients endpoint** (`GET /v3/recipients*` all 404), so the id exists
 * only in the create response. If we do not store it, it is gone — and the only
 * recovery is creating a duplicate recipient.
 *
 * Also doubles as the platform's first saved-payee record. Before this, a
 * customer's bank details were re-typed on every withdrawal into free-text
 * `customFields` and buried in `transaction.metadata`.
 *
 * Note a recipient is a DIFFERENT entity from a payer (`transfi_user`): a payer
 * needs eight fields plus screening, a recipient needs four and no KYC, because
 * on a payout WE are the fund sender. They share the `UX-` prefix, which is why
 * they must not be stored in the same table — passing a payer id where a
 * recipient id belongs would be undetectable by shape alone.
 */
export default class transfiRecipient
  extends Model<transfiRecipientAttributes, transfiRecipientCreationAttributes>
  implements transfiRecipientAttributes
{
  id!: string;
  userId!: string;
  /** TransFi's recipient id (UX-...). */
  transfiRecipientId!: string;
  firstName!: string;
  lastName!: string;
  /** ISO-3166 alpha-2 of the beneficiary. */
  country!: string;
  accountType!: "bank_account" | "iban" | "e_wallet" | "mobile_wallet";
  /**
   * The account number / IBAN / wallet MSISDN.
   *
   * Stored so a customer can pick a saved payee, and so an operator can
   * reconcile a payout against what was actually sent. Treat as sensitive.
   */
  accountValue!: string;
  /** Currency this beneficiary was registered to receive, when known. */
  currency?: string | null;
  /** Operator/customer-facing label, e.g. "M-Pesa 0712…". */
  label?: string | null;
  /**
   * A stable hash of the identifying fields. UNIQUE per user, so re-submitting
   * the same beneficiary reuses the existing TransFi recipient instead of
   * creating a duplicate on their side every time.
   */
  fingerprint!: string;
  lastUsedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize): typeof transfiRecipient {
    return transfiRecipient.init(
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
        transfiRecipientId: {
          type: DataTypes.STRING(64),
          allowNull: false,
          validate: {
            is: {
              args: /^UX-[A-Za-z0-9]+$/,
              msg: "transfiRecipientId: must be a TransFi id of the form UX-...",
            },
          },
        },
        firstName: { type: DataTypes.STRING(191), allowNull: false },
        lastName: { type: DataTypes.STRING(191), allowNull: false },
        country: {
          type: DataTypes.STRING(2),
          allowNull: false,
          validate: { len: { args: [2, 2], msg: "country: must be a 2-letter code" } },
        },
        accountType: {
          type: DataTypes.ENUM("bank_account", "iban", "e_wallet", "mobile_wallet"),
          allowNull: false,
        },
        accountValue: { type: DataTypes.STRING(191), allowNull: false },
        currency: { type: DataTypes.STRING(10), allowNull: true },
        label: { type: DataTypes.STRING(191), allowNull: true },
        fingerprint: {
          type: DataTypes.STRING(64),
          allowNull: false,
          comment: "sha256 of the identifying fields; unique per user",
        },
        lastUsedAt: { type: DataTypes.DATE, allowNull: true },
      },
      {
        sequelize,
        modelName: "transfiRecipient",
        tableName: "transfi_recipient",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            name: "transfiRecipientUserFingerprintKey",
            unique: true,
            fields: [{ name: "userId" }, { name: "fingerprint" }],
          },
          {
            name: "transfiRecipientIdKey",
            unique: true,
            fields: [{ name: "transfiRecipientId" }],
          },
          { name: "transfiRecipientUserIdIdx", fields: [{ name: "userId" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    transfiRecipient.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
