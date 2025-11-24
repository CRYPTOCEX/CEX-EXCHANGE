interface kycApplicationAttributes {
  id: string;
  userId: string;
  levelId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";
  data: any;
  adminNotes?: string;
  reviewedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type kycApplicationPk = "id";
type kycApplicationId = kycApplicationAttributes[kycApplicationPk];
type kycApplicationOptionalAttributes =
  | "id"
  | "adminNotes"
  | "reviewedAt"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";
type kycApplicationCreationAttributes = Omit<
  kycApplicationAttributes,
  "id" | "createdAt" | "updatedAt"
>;

interface KycApplication extends kycApplicationAttributes {
  level: kycLevelAttributes;
  verificationResult: kycVerificationResultAttributes;
}
