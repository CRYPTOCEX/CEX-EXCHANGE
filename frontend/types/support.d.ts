type MessageType = {
  id: string;
  type: "client" | "agent";
  text: string;
  time: string;
  userId: string;
  attachment?: string;
};

type TicketStatus = "OPEN" | "PENDING" | "REPLIED" | "CLOSED" | "RESOLVED";

type TicketType = "LIVE" | "EMAIL";

type TicketImportance = "LOW" | "MEDIUM" | "HIGH";

type Agent = {
  avatar: string | null;
  firstName: string;
  lastName: string;
  lastLogin: string;
};

type Ticket = {
  id: string;
  userId: string;
  agentId: string;
  subject: string;
  importance: TicketImportance;
  status: TicketStatus;
  type: TicketType;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  messages: MessageType[];
  agent: Agent;
  user: User;
};
