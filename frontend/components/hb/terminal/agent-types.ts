/**
 * The wire shapes of the local-agent channel.
 *
 * Mirrors `backend/src/api/(ext)/hb/utils/agent/registry.ts`. Kept in its own
 * module rather than beside the socket hook because both the console route and
 * the setup page read them, and the previous arrangement had one page importing
 * a type out of another page's client component.
 */

export interface AgentInstance {
  /** Hummingbot's own instance id, discovered from its MQTT subscriptions. */
  instanceId: string;
  lastHeartbeatAt: number | null;
  strategy?: string | null;
  running?: boolean | null;
}

export interface AgentPresence {
  connected: boolean;
  lastSeenAt: number | null;
  version?: string | null;
  /** A readable machine label the agent reports — never an address. */
  host?: string | null;
  instances: AgentInstance[];
  /**
   * Whether any enabled key on the account carries `hb:control:bot`.
   *
   * Distinct from `connected` on purpose: an agent can be running while no key
   * carries the scope, in which case its AUTH is being refused and the useful
   * instruction is "add the permission", not "start the agent". Only the REST
   * snapshot knows this; the socket's presence frames leave it undefined.
   */
  canControl?: boolean;
}

export interface TelemetryEvent {
  kind: "log" | "notify" | "status" | "event" | "agent";
  at: number;
  instanceId: string | null;
  text: string;
  level?: string | null;
}

/** Every command the bot's own MQTT bridge exposes. */
export type BotCommand =
  | "status"
  | "start"
  | "stop"
  | "config"
  | "import"
  | "history"
  | "balance_limit"
  | "balance_paper";
