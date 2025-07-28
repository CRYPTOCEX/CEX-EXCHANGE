interface stakingEarningRecordAttributes {
  id: string;
  positionId: string;
  amount: number;
  type: "REGULAR" | "BONUS" | "REFERRAL";
  description: string;
  isClaimed: boolean;
  claimedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type stakingEarningRecordCreationPk = "id";
type stakingEarningRecordId =
  stakingEarningRecordAttributes[stakingEarningRecordCreationPk];

interface stakingEarningRecordCreationAttributes {
  id?: string;
  positionId: string;
  amount: number;
  type: "REGULAR" | "BONUS" | "REFERRAL";
  description: string;
  isClaimed: boolean;
  claimedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
