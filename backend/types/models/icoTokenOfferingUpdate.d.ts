interface icoTokenOfferingUpdateAttributes {
  id: string;
  offeringId: string;
  userId: string;
  title: string;
  content: string;
  attachments?: {
    type: "image" | "document" | "link";
    url: string;
    name: string;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface icoTokenOfferingUpdateCreationAttributes
  extends Partial<icoTokenOfferingUpdateAttributes> {}
