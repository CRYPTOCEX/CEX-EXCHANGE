


interface mailwizardBlockAttributes {
  id: string;
  name: string;
  design: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type mailwizardBlockPk = "id";
type mailwizardBlockId = mailwizardBlockAttributes[mailwizardBlockPk];
type mailwizardBlockOptionalAttributes =
  | "id"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type mailwizardBlockCreationAttributes = Optional<
  mailwizardBlockAttributes,
  mailwizardBlockOptionalAttributes
>;
