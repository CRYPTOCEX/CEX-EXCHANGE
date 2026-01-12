interface binaryDurationAttributes {
  id: string;
  duration: number;

  // Type-specific profit percentages
  profitPercentageRiseFall: number;
  profitPercentageHigherLower: number;
  profitPercentageTouchNoTouch: number;
  profitPercentageCallPut: number;
  profitPercentageTurbo: number;

  // Deprecated - kept for backward compatibility
  profitPercentage: number;

  status: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface binaryDurationCreationAttributes
  extends Optional<
    binaryDurationAttributes,
    | "id"
    | "profitPercentageRiseFall"
    | "profitPercentageHigherLower"
    | "profitPercentageTouchNoTouch"
    | "profitPercentageCallPut"
    | "profitPercentageTurbo"
    | "profitPercentage"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  > {}
