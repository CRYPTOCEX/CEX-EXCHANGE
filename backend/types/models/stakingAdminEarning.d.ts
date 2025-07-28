interface stakingAdminEarningAttributes {
  id: string;
  poolId: string;
  currency: string;
  amount: number;
  type: "PLATFORM_FEE" | "EARLY_WITHDRAWAL_FEE" | "PERFORMANCE_FEE" | "OTHER";
  isClaimed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type stakingAdminEarningCreationPk = "id";
type stakingAdminEarningId =
  stakingAdminEarningAttributes[stakingAdminEarningPk];

interface stakingAdminEarningCreationAttributes
  extends Omit<
    stakingAdminEarningAttributes,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  > {}
