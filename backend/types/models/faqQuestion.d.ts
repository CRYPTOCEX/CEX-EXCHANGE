interface faqQuestionAttributes {
  id: string;
  name: string;
  email: string;
  question: string;
  answer?: string;
  status: "PENDING" | "ANSWERED" | "REJECTED";
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type faqQuestionCreationPk = "id";
type faqQuestionId = faqQuestionAttributes[faqQuestionCreationPk];

interface faqQuestionCreationAttributes
  extends Omit<
    faqQuestionAttributes,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  > {
  id?: string;
}
