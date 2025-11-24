interface faqSearchAttributes {
  id: string;
  userId: string;
  query: string;
  resultCount: number;
  category?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type faqSearchCreationPk = "id";
type faqSearchId = faqSearchAttributes[faqSearchCreationPk];

interface faqSearchCreationAttributes
  extends Omit<
    faqSearchAttributes,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  > {
  id?: string;
}
