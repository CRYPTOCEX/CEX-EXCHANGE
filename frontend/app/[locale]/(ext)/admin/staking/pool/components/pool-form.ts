import * as z from "zod";

export const poolFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  token: z.string().min(1, "Token name is required"),
  symbol: z.string().min(1, "Token symbol is required"),
  icon: z.string().nullable().optional(),
  apr: z.coerce.number().min(0, "APR must be a positive number"),
  minStake: z.coerce.number().min(0, "Minimum stake must be a positive number"),
  maxStake: z.coerce.number().nullable().optional(),
  lockPeriod: z.coerce.number().min(1, "Lock period must be at least 1 day"),
  availableToStake: z.coerce
    .number()
    .min(0, "Available to stake must be a positive number"),
  status: z.enum(["ACTIVE", "INACTIVE", "COMING_SOON"]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  risks: z.string().min(10, "Risks must be at least 10 characters"),
  rewards: z.string().min(10, "Rewards must be at least 10 characters"),
  isPromoted: z.boolean().default(false),
  order: z.coerce.number().int().min(1, "Order must be a positive integer"),
  // New fields for centralized staking
  externalPoolUrl: z.string().url("Must be a valid URL").optional().nullable(),
  adminFeePercentage: z.coerce
    .number()
    .min(0)
    .max(100, "Fee percentage must be between 0 and 100")
    .default(10),
  earningFrequency: z
    .enum(["DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"])
    .default("MONTHLY"),
  earlyWithdrawalFee: z.coerce
    .number()
    .min(0)
    .max(100, "Fee percentage must be between 0 and 100")
    .default(5),
  autoCompound: z.boolean().default(false),
  profitSource: z
    .string()
    .min(10, "Profit source description must be at least 10 characters")
    .default(""),
  fundAllocation: z
    .string()
    .min(10, "Fund allocation description must be at least 10 characters")
    .default(""),
  maxPoolSize: z.coerce.number().nullable().optional(),
});

export interface PoolFormValues {
  name: string;
  token: string;
  symbol: string;
  icon?: string | File;
  apr: number;
  minStake: number;
  maxStake: number | null;
  lockPeriod: number;
  availableToStake: number;
  totalStaked: number;
  status: "ACTIVE" | "INACTIVE" | "COMING_SOON";
  description: string;
  risks: string;
  rewards: string;
  isPromoted: boolean;
  order: number;
  externalPoolUrl?: string;
  adminFeePercentage: number;
  earningFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "END_OF_TERM";
  earlyWithdrawalFee: number;
  autoCompound: boolean;
  profitSource: string;
  fundAllocation: string;
  maxPoolSize?: number | null;
}
