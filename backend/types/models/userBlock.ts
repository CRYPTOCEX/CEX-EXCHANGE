export interface userBlockAttributes {
  id: string;
  userId: string;
  adminId: string;
  reason: string;
  isTemporary: boolean;
  duration?: number;
  blockedUntil?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface userBlockCreationAttributes
  extends Omit<userBlockAttributes, "id" | "createdAt" | "updatedAt"> {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 