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
  if (!user) return false;
  
  // Some APIs may return featureAccess as string[] directly on user
  if (Array.isArray(user.featureAccess)) {
    return user.featureAccess.includes(feature);
  }
  
  // Parse features from kyc.level
  if (user.kyc?.level?.features) {
    let features: string[] = [];
    try {
      features = typeof user.kyc.level.features === 'string'
        ? JSON.parse(user.kyc.level.features)
        : user.kyc.level.features;
    } catch {
      /* ignore parsing errors */
    }
    if (Array.isArray(features)) {
      return features.includes(feature);
    }
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

// Check if user needs to complete KYC for a feature
export function requiresKyc(user: User | null, feature: string): boolean {
  if (!user) return true;
  
  // If KYC is not approved, they need to complete it
  if (!isUserKycApproved(user)) {
    return true;
  }
  
  // If they don't have access to the feature, they need higher KYC
  return !hasFeature(user, feature);
}
