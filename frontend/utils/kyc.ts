// User type definition based on backend model
interface User {
  id: string;
  email?: string;
  avatar?: string | null;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified?: boolean;
  roleId: number;
  profile?: any;
  walletAddress?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED";
  twoFactor?: {
    enabled: boolean;
    type?: string;
  };
  kyc?: {
    status: string;
    level?: {
      level?: number;
      features?: string | string[];
    };
  };
  kycLevel?: number;
  featureAccess?: string[];
}

// Check if site KYC is enabled (handle both string and boolean values)
export function isKycEnabled(settings: Record<string, any>): boolean {
  return settings?.kycStatus === true || settings?.kycStatus === "true";
}

// User has completed KYC (e.g. "APPROVED")
export function isUserKycApproved(user: User | null): boolean {
  if (!user) return false;
  
  // Check the kyc object for approved status
  return !!user.kyc && user.kyc.status === "APPROVED";
}

// User has access to a given feature (by slug or constant)
export function hasFeature(user: User | null, feature: string): boolean {
  if (!user) {
    return false;
  }
  
  // First check if KYC is approved - if not, user has no features
  if (!isUserKycApproved(user)) {
    return false;
  }
  
  // Normalize feature name to handle case variations
  const normalizedFeature = feature.toLowerCase();
  
  // Get the user's KYC level
  const userLevel = user.kycLevel || user.kyc?.level?.level || 0;
  
  // IMPORTANT: Special handling for high-level KYC users
  // Many sites configure their highest level differently (3, 4, 5, etc.)
  // If user has level >= 3, they should have access to all features
  if (userLevel >= 3) {
    return true;
  }
  
  // For sites that have many features configured (20+ features)
  // This likely means they want to give access to most/all features
  const MIN_FEATURES_FOR_FULL_ACCESS = 20;
  
  // Check featureAccess array (primary source set by backend)
  if (Array.isArray(user.featureAccess)) {
    // If user has many features (20+), grant access to all
    if (user.featureAccess.length >= MIN_FEATURES_FOR_FULL_ACCESS) {
      return true;
    }
    
    // Empty array with approved KYC and level > 0 means all features
    if (user.featureAccess.length === 0 && userLevel > 0) {
      return true;
    }
    
    // Check if specific feature is in the array
    const hasFeatureInArray = user.featureAccess.some(f => 
      f.toLowerCase() === normalizedFeature
    );
    if (hasFeatureInArray) {
      return true;
    }
  }
  
  // Check features from kyc.level (fallback)
  if (user.kyc?.level?.features) {
    let features: string[] = [];
    try {
      features = typeof user.kyc.level.features === 'string'
        ? JSON.parse(user.kyc.level.features)
        : user.kyc.level.features;
    } catch {
      // If parsing fails, assume no features
      features = [];
    }
    
    if (Array.isArray(features)) {
      // If user has many features (20+), grant access to all
      if (features.length >= MIN_FEATURES_FOR_FULL_ACCESS) {
        return true;
      }
      
      // Empty features with approved KYC and level > 0 means all features
      if (features.length === 0 && userLevel > 0) {
        return true;
      }
      
      // Check if specific feature is in the array
      const hasFeatureInLevel = features.some(f => 
        (typeof f === 'string' ? f.toLowerCase() : '') === normalizedFeature
      );
      if (hasFeatureInLevel) {
        return true;
      }
    }
  }
  
  // Final fallback: If KYC is approved, user has a level > 0, 
  // but no features are configured, grant access (misconfigured site)
  if (!user.featureAccess && !user.kyc?.level?.features && userLevel > 0) {
    return true;
  }
  
  return false;
}

// Get user's KYC level
export function getUserKycLevel(user: User | null): number {
  if (!user) return 0;
  
  // Check if user has a KYC level set directly
  if (user.kycLevel) {
    return user.kycLevel;
  }
  
  // Fallback to kyc.level.level
  if (user.kyc?.level?.level) {
    return user.kyc.level.level;
  }
  
  return 0;
}

// Check if user needs to complete KYC verification (not approved yet)
export function needsKycVerification(user: User | null): boolean {
  if (!user) return true;
  
  // User needs KYC if it's not approved
  return !isUserKycApproved(user);
}

// Check if user needs higher KYC level for a specific feature
export function needsHigherKycLevel(user: User | null, feature: string): boolean {
  if (!user) return true;
  
  // First check if KYC is approved
  if (!isUserKycApproved(user)) {
    return false; // They need basic KYC first, not higher level
  }
  
  // If KYC is approved, check if they have the feature
  return !hasFeature(user, feature);
}

// Combined check: Does user need KYC or higher level for feature?
// Returns an object with status and message
export function getKycRequirement(user: User | null, feature: string): {
  required: boolean;
  type: 'none' | 'verification' | 'higher_level';
  message: string;
} {
  if (!user) {
    return {
      required: true,
      type: 'verification',
      message: 'Please log in to continue'
    };
  }
  
  // Check if basic KYC is approved
  if (!isUserKycApproved(user)) {
    return {
      required: true,
      type: 'verification',
      message: 'KYC verification required'
    };
  }
  
  // Check if user has access to the feature
  if (!hasFeature(user, feature)) {
    return {
      required: true,
      type: 'higher_level',
      message: `Higher KYC level required for ${feature.toLowerCase().replace(/_/g, ' ')}`
    };
  }
  
  // User has everything they need
  return {
    required: false,
    type: 'none',
    message: ''
  };
}

// DEPRECATED: This function had incorrect logic and should not be used
// Use getKycRequirement() instead
export function requiresKyc(user: User | null, feature: string): boolean {
  console.warn('requiresKyc() is deprecated. Use getKycRequirement() instead.');
  const requirement = getKycRequirement(user, feature);
  return requirement.required;
}