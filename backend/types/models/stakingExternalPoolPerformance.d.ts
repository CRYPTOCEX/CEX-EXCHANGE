interface stakingExternalPoolPerformanceAttributes {
  id: string;
  poolId: string;
  date: Date;
  apr: number;
  totalStaked: number;
  profit: number;
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type stakingExternalPoolPerformanceCreationPk = "id";
type stakingExternalPoolPerformanceId =
  stakingExternalPoolPerformanceAttributes[stakingExternalPoolPerformanceCreationPk];

interface stakingExternalPoolPerformanceCreationAttributes
  extends Omit<
    stakingExternalPoolPerformanceAttributes,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  > {
  id?: string;
}
