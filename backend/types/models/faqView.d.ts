interface faqViewAttributes {
  id: string;
  faqId: string;
  sessionId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type faqViewCreationPk = "id";
type faqViewId = faqViewAttributes[faqViewCreationPk];

interface faqViewCreationAttributes
  extends Omit<
    faqViewAttributes,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  > {
  id?: string;
}
