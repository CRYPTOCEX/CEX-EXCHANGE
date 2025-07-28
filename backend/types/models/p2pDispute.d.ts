interface p2pDisputeAttributes {
  id: string;
  tradeId: string;
  amount: string;
  reportedById: string;
  againstId: string;
  reason: string;
  details?: string;
  filedOn: Date;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  priority: "HIGH" | "MEDIUM" | "LOW";
  resolution?: any;
  resolvedOn?: Date;
  messages?: any;
  evidence?: any;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface p2pDisputeCreationAttributes extends Partial<p2pDisputeAttributes> {}
