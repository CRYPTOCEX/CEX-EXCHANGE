interface notificationAttributes {
  id: string;
  userId: string;
  relatedId?: string;
  title: string;
  type: "investment" | "message" | "user" | "alert" | "system";
  message: string;
  details?: string;
  link?: string;
  actions?: any;
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface notificationCreationAttributes
  extends Partial<notificationAttributes> {}

type notificationId = string;
