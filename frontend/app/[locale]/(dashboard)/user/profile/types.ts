import type { LucideIcon } from "lucide-react";

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  permissions: string[];
  ipRestrictions: string[];
}

export interface SecuritySettings {
  loginNotifications: boolean;
  withdrawalWhitelist: boolean;
  advancedLoginProtection: boolean;
  sessionTimeout: number;
  recentDevices: Device[];
}

export interface Device {
  id: string;
  name: string;
  ipAddress: string;
  lastActive: string;
  location: string;
  current: boolean;
}

export interface ApiPermission {
  label: string;
  value: string;
  description: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status: "success" | "pending" | "failed";
  details?: string;
}

export type TwoFactorMethod = "APP" | "SMS" | "EMAIL" | null;
export type TwoFactorSetupStep = "select" | "setup" | "verify" | "success";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
  color?: "default" | "blue" | "green" | "amber" | "red" | "purple";
}

export interface ActivityCardProps {
  activity: ActivityItem;
}

export interface TabButtonProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}
