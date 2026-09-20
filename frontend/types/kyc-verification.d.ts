// KYC Verification Service Types
type VerificationServiceStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "TESTING"
  | "DEPRECATED";

interface VerificationServiceField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  placeholder?: string;
  validations?: Record<string, any>;
  options?: Array<{ label: string; value: string }>;
}

interface VerificationTemplate {
  id: string;
  name: string;
  description: string;
  fields: any[];
  requiredDocuments?: string[];
  aiVerificationNote?: string;
}

interface VerificationService extends kycVerificationServiceAttributes {
  templates: VerificationTemplate[];
}
