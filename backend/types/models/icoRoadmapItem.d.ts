interface icoRoadmapItemAttributes {
  id: string;
  offeringId: string;
  title: string;
  description: string;
  date: string;
  completed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface icoRoadmapItemCreationAttributes
  extends Partial<icoRoadmapItemAttributes> {}
