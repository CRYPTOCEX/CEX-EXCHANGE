// Interfaces for attributes and creation
interface kycLevelAttributes {
  id: string;
  serviceId?: string; // UUID of the verification service
  name: string;
  description?: string;
  level: number;
  fields?: any; // JSON array of field objects
  features?: any; // JSON array of features
  status: "ACTIVE" | "DRAFT" | "INACTIVE";
  createdAt?: Date;
  updatedAt?: Date;
}

type kycLevelPk = "id";
type kycLevelId = kycLevelAttributes[kycLevelPk];
type kycLevelOptionalAttributes =
  | "id"
  | "serviceId"
  | "description"
  | "fields"
  | "features"
  | "createdAt"
  | "updatedAt";
type kycLevelCreationAttributes = Omit<
  kycLevelAttributes,
  "id" | "createdAt" | "updatedAt"
>;

interface KycLevel extends kycLevelAttributes {
  completionRate?: number;
  usersVerified?: number;
  pendingVerifications?: number;
  rejectionRate?: number;
  verificationService: kycVerificationServiceAttributes;
}
