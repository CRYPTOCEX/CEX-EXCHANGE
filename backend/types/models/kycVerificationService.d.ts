interface kycVerificationServiceAttributes {
  id: string;
  name: string;
  description: string;
  type: string;
  integrationDetails: any;
  createdAt?: Date;
  updatedAt?: Date;
}

type kycVerificationServicePk = "id";
type kycVerificationServiceId =
  kycVerificationServiceAttributes[kycVerificationServicePk];
type kycVerificationServiceOptionalAttributes =
  | "id"
  | "createdAt"
  | "updatedAt";
type kycVerificationServiceCreationAttributes = Omit<
  kycVerificationServiceAttributes,
  kycVerificationServiceOptionalAttributes
>;
