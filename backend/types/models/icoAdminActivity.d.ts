interface icoAdminActivityAttributes {
  id: string;
  type: string;
  offeringId: string;
  offeringName: string;
  adminId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface icoAdminActivityCreationAttributes
  extends Partial<icoAdminActivityAttributes> {}
