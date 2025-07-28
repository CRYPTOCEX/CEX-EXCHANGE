


interface notificationTemplateAttributes {
  id: number;
  name: string;
  subject: string;
  emailBody?: string;
  smsBody?: string;
  pushBody?: string;
  shortCodes?: string;
  email?: boolean;
  sms?: boolean;
  push?: boolean;
}

type notificationTemplatePk = "id";
type notificationTemplateId =
  notificationTemplateAttributes[notificationTemplatePk];
type notificationTemplateOptionalAttributes =
  | "id"
  | "emailBody"
  | "smsBody"
  | "pushBody"
  | "shortCodes"
  | "email"
  | "sms"
  | "push";
type notificationTemplateCreationAttributes = Optional<
  notificationTemplateAttributes,
  notificationTemplateOptionalAttributes
>;
