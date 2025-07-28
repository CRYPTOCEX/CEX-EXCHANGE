interface SupportMessage {
  type: "client" | "agent";
  text: string;
  time: string; // or Date, but ISO string is safer for JSON
  userId: string;
  attachment?: string;
}

interface supportTicketAttributes {
  id: string;
  userId: string;
  agentId?: string | null;
  agentName?: string | null;
  subject: string;
  importance: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "OPEN" | "REPLIED" | "CLOSED";
  messages?: SupportMessage[] | null;
  type?: "LIVE" | "TICKET";
  tags?: string[] | null;
  responseTime?: number | null;
  satisfaction?: number | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

type supportTicketPk = "id";
type supportTicketId = supportTicketAttributes[supportTicketPk];
type supportTicketOptionalAttributes =
  | "id"
  | "agentId"
  | "agentName"
  | "importance"
  | "status"
  | "messages"
  | "type"
  | "tags"
  | "responseTime"
  | "satisfaction"
  | "createdAt"
  | "deletedAt"
  | "updatedAt";
type supportTicketCreationAttributes = Optional<
  supportTicketAttributes,
  supportTicketOptionalAttributes
>;
