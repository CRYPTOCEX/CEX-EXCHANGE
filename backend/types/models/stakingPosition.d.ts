interface stakingPositionAttributes {
  id: string;
  userId: string;
  poolId: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "PENDING_WITHDRAWAL";
  withdrawalRequested: boolean;
  withdrawalRequestDate: Date | null;
  adminNotes: string | null;
  completedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type stakingPositionCreationPk = "id";
type stakingPositionId = stakingPositionAttributes[stakingPositionCreationPk];

interface stakingPositionCreationAttributes {
  userId: string;
  poolId: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "PENDING_WITHDRAWAL";
  withdrawalRequested: boolean;
  withdrawalRequestDate: Date | null;
  adminNotes: string | null;
  completedAt: Date | null;
}
