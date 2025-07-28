interface faqAttributes {
  id: string;
  question: string;
  answer: string;
  image?: string;
  category: string;
  tags?: string[];
  status: boolean;
  order: number;
  pagePath: string;
  relatedFaqIds?: string[];
  views?: number;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type faqCreationPk = "id";
type faqId = faqAttributes[faqCreationPk];

interface faqCreationAttributes
  extends Omit<faqAttributes, "id" | "createdAt" | "updatedAt" | "deletedAt"> {
  id?: string;
}
