


interface withdrawMethodAttributes {
  id: string;
  title: string;
  processingTime: string;
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

type withdrawMethodPk = "id";
type withdrawMethodId = withdrawMethodAttributes[withdrawMethodPk];
type withdrawMethodOptionalAttributes =
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
type withdrawMethodCreationAttributes = Optional<
  withdrawMethodAttributes,
  withdrawMethodOptionalAttributes
>;
