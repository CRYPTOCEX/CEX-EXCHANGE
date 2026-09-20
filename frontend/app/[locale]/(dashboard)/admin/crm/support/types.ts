/**
 * The wire shapes of the support desk console.
 *
 * Verified field by field against:
 *   backend/src/api/admin/crm/support/inbox/index.get.ts
 *   backend/src/api/admin/crm/support/ticket/[id]/index.get.ts
 *
 * Declared in full, including the fields the queue row does not draw today
 * (`responseTime`, `satisfaction`, `agentAvatar`) — a screen that keeps asking
 * for data it never shows anyone is the cheapest kind of waste, and the only
 * way to notice is for the type to say what actually arrives.
 */

export type TicketStatus = "PENDING" | "OPEN" | "REPLIED" | "CLOSED";
export type TicketImportance = "LOW" | "MEDIUM" | "HIGH";

export interface DeskCustomer {
  id: string | null;
  name: string;
  email: string | null;
  avatar: string | null;
}

/** One line in the queue pane. */
export interface DeskRow {
  id: string;
  subject: string;
  status: TicketStatus;
  importance: TicketImportance;
  type: "LIVE" | "TICKET";
  agentId: string | null;
  agentName: string | null;
  agentAvatar: string | null;
  customer: DeskCustomer;
  messageCount: number;
  /** Who had the last word. `null` when the thread is empty. */
  lastMessageFrom: "client" | "agent" | null;
  lastMessageAt: string | null;
  preview: string;
  /**
   * The customer spoke last (or nobody has yet) and the ticket is open.
   *
   * It agrees with `status in (PENDING, OPEN)` on every ticket the reply routes
   * have written, because those routes write OPEN when a customer speaks. It is
   * computed from the thread anyway because `status` is ALSO writable by hand
   * from the desk's own status control, and the thread is the one that decides
   * whether a person is actually waiting for an answer.
   */
  waitingOnUs: boolean;
  waitingSince: string;
  ageMinutes: number;
  responseTime: number | null;
  satisfaction: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The queue's scopes, which are also the keys of `counts`.
 *
 * `open` is everything the desk still owns and is the default. `waiting` is the
 * customer having had the last word — a fact about the thread, now carried as
 * `supportTicket.lastMessageFrom` so it can be filtered and sorted in SQL.
 */
export type QueueScope =
  | "open"
  | "waiting"
  | "mine"
  | "unassigned"
  | "closed";

export type QueueSort =
  | "queue"
  | "activity"
  | "created"
  | "importance"
  | "status"
  | "subject"
  | "customer"
  | "response"
  | "satisfaction";

export type QueueOrder = "asc" | "desc";

/**
 * The queue page.
 *
 * `counts` is computed server-side over the WHOLE desk (narrowed by the search
 * box, never by the scope), which is what lets each tab say how many of its own
 * conversations exist — the tallies used to be derived from the fetched page, so
 * "Waiting 12" meant "twelve of the sixty rows we happened to get".
 *
 * There is no `capped` any more, and its absence is the point: the queue is
 * paged rather than truncated, so `total` and `pages` say exactly how much desk
 * there is instead of admitting that some of it was thrown away.
 */
export interface DeskQueue {
  items: DeskRow[];
  counts: Record<QueueScope | "all", number>;
  /** Rows matching the current scope AND search, across every page. */
  total: number;
  page: number;
  pages: number;
  perPage: number;
  scope: QueueScope;
  sort: QueueSort;
  order: QueueOrder;
}

/** The stats the ticket detail route computes for the customer and the agent. */
export interface DeskUserStats {
  totalTickets: number;
  resolvedTickets: number;
}

export interface DeskAgentStats {
  resolved: number;
  avgRating: number | null;
}

/** `GET /api/admin/crm/support/ticket/{id}` — the open conversation. */
export interface DeskTicket {
  id: string;
  userId: string;
  agentId?: string | null;
  agentName?: string | null;
  subject: string;
  importance: TicketImportance;
  status: TicketStatus;
  /** Raw column. Three on-disk shapes — always read it through `toThread`. */
  messages?: unknown;
  type?: "LIVE" | "TICKET";
  tags?: string[] | null;
  responseTime?: number | null;
  satisfaction?: number | null;
  createdAt?: string;
  updatedAt?: string;
  agent?: {
    id: string;
    avatar?: string | null;
    firstName?: string;
    lastName?: string;
    lastLogin?: string;
  } | null;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string | null;
  } | null;
  userStats?: DeskUserStats;
  agentStats?: DeskAgentStats | null;
}
