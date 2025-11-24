


interface mailwizardTemplateAttributes {
  id: string;
  name: string;
  content: string;
  design: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type mailwizardTemplatePk = "id";
type mailwizardTemplateId = mailwizardTemplateAttributes[mailwizardTemplatePk];
type mailwizardTemplateOptionalAttributes =
  | "id"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type mailwizardTemplateCreationAttributes = Optional<
  mailwizardTemplateAttributes,
  mailwizardTemplateOptionalAttributes
>;
