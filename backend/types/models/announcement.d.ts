interface announcementAttributes {
  id: string;
  type: "GENERAL" | "EVENT" | "UPDATE";
  title: string;
  message: string;
  link?: string;
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

type announcementPk = "id";
type announcementId = announcementAttributes[announcementPk];
type announcementOptionalAttributes =
  | "id"
  | "type"
  | "link"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "deletedAt";
type announcementCreationAttributes = Optional<
  announcementAttributes,
  announcementOptionalAttributes
>;
