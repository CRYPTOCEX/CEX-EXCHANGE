interface stakingAdminActivityAttributes {
  id: string;
  userId: string;
  action: "create" | "update" | "delete" | "approve" | "reject" | "distribute";
  type: "pool" | "position" | "earnings" | "settings" | "withdrawal";
  relatedId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type stakingAdminActivityCreationPk = "id";
type stakingAdminActivityId =
  stakingAdminActivityAttributes[stakingAdminActivityCreationPk];

interface stakingAdminActivityCreationAttributes
  extends Omit<
    stakingAdminActivityAttributes,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  > {}
