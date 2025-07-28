interface kycVerificationResultAttributes {
  id: string;
  applicationId: string;
  serviceId: string;
  status: "VERIFIED" | "FAILED" | "PENDING" | "NOT_STARTED";
  score?: number;
  checks?: any;
  documentVerifications?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

type kycVerificationResultPk = "id";
type kycVerificationResultId =
  kycVerificationResultAttributes[kycVerificationResultPk];
type kycVerificationResultOptionalAttributes =
  | "id"
  | "score"
  | "checks"
  | "documentVerifications"
  | "createdAt"
  | "updatedAt";
type kycVerificationResultCreationAttributes = Omit<
  kycVerificationResultAttributes,
  "id" | "createdAt" | "updatedAt"
>;
