// KYC Application status
type ApplicationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ADDITIONAL_INFO_REQUIRED";

// Application with user and level information
interface ApplicationWithDetails extends kycApplicationAttributes {
  user: userAttributes;
  level: KycLevel;
  verificationResult?: VerificationResult;
  reviewedAt?: string | Date;
}

// Application filter options
interface ApplicationFilters {
  status?: ApplicationStatus;
  levelId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface VerificationResult {
  id: string;
  applicationId: string;
  serviceId: string;
  serviceName?: string;
  status:
    | "PENDING"
    | "PROCESSING"
    | "APPROVED"
    | "REJECTED"
    | "MANUAL_REVIEW"
    | "VERIFIED"
    | "FAILED";
  score?: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
  checks?:
    | {
        selfieMatch?: boolean;
        documentAuthentic?: boolean;
        confidenceScore?: number;
        issues?: string[];
        extractedInfo?: Record<string, any>;
        summary?: Record<string, any>;
        detectedIssues?: string[];
        processedFields?: number;
        processedDocuments?: number;
      }
    | Record<string, any>;
  documentVerifications?:
    | {
        message?: string;
        details?: string;
        aiResponse?: Record<string, any>;
      }
    | Record<string, any>[];
  service?: {
    id: string;
    name: string;
    type: string;
  };
  notes?: string;
  rejectionReason?: string;
}
