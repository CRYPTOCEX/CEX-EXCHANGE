interface faqFeedbackAttributes {
  id: string;
  faqId: string;
  userId: string;
  isHelpful: boolean;
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type faqFeedbackCreationPk = "id";
type faqFeedbackId = faqFeedbackAttributes[faqFeedbackCreationPk];

interface faqFeedbackCreationAttributes
  extends Omit<
    faqFeedbackAttributes,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
  > {
  id?: string;
}
