interface binaryDurationAttributes {
  id: string;
  duration: number;
  profitPercentage: number;
  status: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface binaryDurationCreationAttributes
  extends Optional<
    binaryDurationAttributes,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  > {}
