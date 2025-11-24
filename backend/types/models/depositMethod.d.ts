interface depositMethodAttributes {
  id: string;
  title: string;
  instructions: string;
  image?: string;
  fixedFee: number;
  percentageFee: number;
  minAmount: number;
  maxAmount: number;
  customFields?: string;
  status?: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type depositMethodPk = "id";
type depositMethodId = depositMethodAttributes[depositMethodPk];
type depositMethodOptionalAttributes =
  | "id"
  | "image"
  | "fixedFee"
  | "percentageFee"
  | "minAmount"
  | "customFields"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type depositMethodCreationAttributes = Optional<
  depositMethodAttributes,
  depositMethodOptionalAttributes
>;
