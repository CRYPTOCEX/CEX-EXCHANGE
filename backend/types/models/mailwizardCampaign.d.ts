


interface mailwizardCampaignAttributes {
  id: string;
  name: string;
  subject: string;
  status:
    | "PENDING"
    | "PAUSED"
    | "ACTIVE"
    | "STOPPED"
    | "COMPLETED"
    | "CANCELLED";
  speed: number;
  targets?: string;
  templateId: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type mailwizardCampaignPk = "id";
type mailwizardCampaignId = mailwizardCampaignAttributes[mailwizardCampaignPk];
type mailwizardCampaignOptionalAttributes =
  | "id"
  | "status"
  | "speed"
  | "targets"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type mailwizardCampaignCreationAttributes = Optional<
  mailwizardCampaignAttributes,
  mailwizardCampaignOptionalAttributes
>;
