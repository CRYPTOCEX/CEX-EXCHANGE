interface notificationAttributes {
  id: string;
  userId: string;
  relatedId?: string;
  title: string;
  type: string;
  message: string;
  details?: string;
  link?: string;
  actions?: any;
  read: boolean;
  idempotencyKey?: string;
  channels?: any;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface notificationCreationAttributes
  extends Partial<notificationAttributes> {}

type notificationId = string;
