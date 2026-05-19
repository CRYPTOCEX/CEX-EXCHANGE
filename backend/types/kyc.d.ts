interface KycField {
  id: string;
  order?: number;
  type: KycFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: KycFieldOption[];
  fields?: KycField[];
  validation?: KycFieldValidation;
  conditional?: KycFieldConditional;
  rows?: number;
  min?: number;
  step?: number;
  format?: string;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  verificationField?: {
    serviceFieldId: string;
    mappingType: string;
  };
  // Identity field specific properties
  identityTypes?: IdentityType[];
  defaultType?: string;
  requireSelfie?: boolean;
  hidden?: boolean;
}

// KYC Field Type
type KycFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "EMAIL"
  | "PHONE"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "CHECKBOX"
  | "RADIO"
  | "IMAGE"
  | "FILE"
  | "SECTION"
  | "ADDRESS"
  | "IDENTITY"; // New field type for identity verification

// KYC Field Option
interface KycFieldOption {
  label: string;
  value: string;
}

// KYC Field Validation
interface KycFieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  message?: string;
  minDate?: string; // ISO date string
  maxDate?: string; // ISO date string
  maxSize?: number; // in bytes
}

// KYC Field Conditional
interface KycFieldConditional {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "NOT_CONTAINS"
    | "GREATER_THAN"
    | "LESS_THAN";
  value: string | number | boolean;
}
