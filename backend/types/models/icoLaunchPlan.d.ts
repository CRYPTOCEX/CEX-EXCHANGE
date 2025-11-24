interface icoLaunchPlanAttributes {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  walletType: string;
  features: {
    maxTeamMembers: number;
    maxRoadmapItems: number;
    maxOfferingPhases: number;
    supportLevel: "basic" | "standard" | "premium";
    marketingSupport: boolean;
    auditIncluded: boolean;
    customTokenomics: boolean;
    priorityListing: boolean;
    kycRequired: boolean;
    [key: string]: any;
  };
  recommended: boolean;
  status: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface icoLaunchPlanCreationAttributes
  extends Partial<icoLaunchPlanAttributes> {}
