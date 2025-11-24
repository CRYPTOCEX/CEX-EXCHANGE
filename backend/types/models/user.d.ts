interface userAttributes {
  id: string;
  email?: string;
  password?: string;
  avatar?: string | null;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified?: boolean;
  roleId: number;
  profile?: UserProfile | string;
  lastLogin?: Date;
  lastFailedLogin?: Date | null;
  failedLoginAttempts?: number;
  walletAddress?: string;
  walletProvider?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED";
  settings?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type userPk = "id";
type userId = userAttributes[userPk];
type userOptionalAttributes =
  | "id"
  | "email"
  | "password"
  | "avatar"
  | "firstName"
  | "lastName"
  | "emailVerified"
  | "phone"
  | "phoneVerified"
  | "roleId"
  | "profile"
  | "lastLogin"
  | "lastFailedLogin"
  | "failedLoginAttempts"
  | "walletAddress"
  | "walletProvider"
  | "status"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type userCreationAttributes = Optional<userAttributes, userOptionalAttributes>;

interface Role extends roleAttributes {
  permissions: permissionAttributes[];
}

interface User extends userAttributes {
  twoFactor: twoFactorAttributes;
  role: Role;
  kyc: KycApplication;
  kycLevel?: number;
  featureAccess: string[];
  apiKeys: apiKeyAttributes[];
  nftCount?: number;
  followersCount?: number;
  isFollowing?: boolean;
  providers: providerUserAttributes[];
}

type UserProfile = {
  bio: string;
  location: {
    address: string;
    city: string;
    country: string;
    zip: string;
  };
  social: {
    twitter: string;
    dribbble: string;
    instagram: string;
    github: string;
    gitlab: string;
    telegram: string;
  };
};
