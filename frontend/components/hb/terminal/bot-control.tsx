"use client";

/**
 * Drive the customer's own bot from here.
 *
 * WHAT MAKES THIS DIFFERENT FROM THE REST OF THE TERMINAL
 * Every other panel is a mirror: it reads rows we already own and can be wrong
 * only by being stale. This one has EFFECTS, on a machine we cannot see, and its
 * failures are the interesting part — a command can be refused by us, accepted by
 * us and undeliverable to the agent, delivered and rejected by the bot, or
 * delivered and simply never answered. Those are four different sentences and the
 * panel says which one happened, because "failed" would send the operator to look
 * in the wrong place three times out of four.
 *
 * THE SAFETY MODEL IS THE LAYOUT. `status` and `history` read; the other six
 * change something. They are separated visually, the destructive direction is
 * never the default focus, and anything that alters how money trades asks first.
 * Confirmation is a UI decision, not a security control — the security control is
 * that the protocol cannot express anything worse than these eight commands.
 */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Blocks,
  CheckCircle2,
  ChevronRight,
  CircleStop,
  Coins,
  Download,
  Gauge,
  History,
  Play,
  PlugZap,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/terminal";
import { fmtAge } from "./types";
import { useNow } from "./use-now";
import type { AgentInstance, AgentPresence, BotCommand } from "./agent-types";
import { useTranslations } from "next-intl";

export interface CommandOutcome {
  ok: boolean;
  data?: any;
  error?: string;
  code?: string;
}

export interface BotControlProps {
  agent: AgentPresence | null;
  /** Resolves — never rejects. See `useConsoleSocket.sendCommand`. */
  onCommand: (
    command: BotCommand,
    params?: Record<string, any>,
    instanceId?: string | null
  ) => Promise<CommandOutcome>;
  /** Where a customer goes to install or fix the agent. */
  setupHref: string;
  keysHref: string;
}

interface LogLine {
  at: number;
  command: BotCommand;
  ok: boolean;
  text: string;
}

export function BotControl({ agent, onCommand, setupHref, keysHref }: BotControlProps) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const [busy, setBusy] = useState<BotCommand | null>(null);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    command: BotCommand;
    params: Record<string, any>;
    label: string;
    detail: string;
  } | null>(null);
  const [form, setForm] = useState<BotCommand | null>(null);
  const now = useNow(1000);

  // Memoised so the `active` lookup below does not take a new array identity on
  // every render — this panel re-renders on a 1Hz clock.
  const instances = useMemo<AgentInstance[]>(() => agent?.instances ?? [], [agent]);
  const active = useMemo<AgentInstance | null>(() => {
    if (!instances.length) return null;
    return instances.find((i) => i.instanceId === instanceId) ?? instances[0];
  }, [instances, instanceId]);

  const run = useCallback(
    async (command: BotCommand, params?: Record<string, any>) => {
      setBusy(command);
      const res = await onCommand(command, params, active?.instanceId ?? null);
      setBusy(null);
      setLines((prev) =>
        prev
          .concat({
            at: Date.now(),
            command,
            ok: res.ok,
            text: describeOutcome(command, res),
          })
          .slice(-40)
      );
      return res;
    },
    [onCommand, active]
  );

  /* ------------------------------------------------------------- gating */

  if (!agent || !agent.connected) {
    // `canControl === false` is a different problem with a different fix, and
    // only the REST snapshot knows it — an agent whose key lacks the scope is
    // being refused at AUTH, so telling them to start it would be a loop.
    const missingScope = agent?.canControl === false;
    return (
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        <EmptyState
          icon={<PlugZap className="h-6 w-6" />}
          title={missingScope ? t("your_key_cannot_control_a_bot") : t("no_agent_connected")}
          hint={
            missingScope
              ? t("the_agent_authenticates_with_an_api")
              : t("remote_control_runs_through_a_small")
          }
        />
        <div className="flex flex-wrap justify-center gap-2 px-3 pb-4">
          <Link
            href={missingScope ? keysHref : setupHref}
            className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-3"
          >
            {missingScope ? (
              <>
                <Settings2 className="h-3 w-3" />
                {t("add_the_permission")}
              </>
            ) : (
              <>
                <Download className="h-3 w-3" />
                {t("set_up_the_agent")}
              </>
            )}
          </Link>
        </div>
      </div>
    );
  }

  if (!instances.length) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title={t("agent_running_no_bot_attached")}
          hint={t("the_agent_is_connected_to_us")}
        />
      </div>
    );
  }

  /* -------------------------------------------------------------- panel */

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Which bot. Only shown when there is a choice — a selector with one
          option is furniture. */}
      {instances.length > 1 && (
        <div className="flex shrink-0 gap-px overflow-x-auto border-b border-border bg-surface-2 scrollbar-none">
          {instances.map((i) => (
            <button
              key={i.instanceId}
              type="button"
              onClick={() => setInstanceId(i.instanceId)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-1 font-mono text-[10px] transition-colors",
                i.instanceId === active?.instanceId
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              title={i.instanceId}
            >
              {i.instanceId.slice(0, 12)}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
        {/* Agent facts. The heartbeat age is the honest liveness signal — the
            socket being open only proves the agent process exists. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5 text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Agent
            {agent.version ? <span className="font-mono">v{agent.version}</span> : null}
          </span>
          {agent.host && <span className="truncate font-mono">{agent.host}</span>}
          {active?.lastHeartbeatAt && (
            <span className="font-mono tabular-nums">
              bot heartbeat {fmtAge(Math.max(0, now - active.lastHeartbeatAt))} ago
            </span>
          )}
        </div>

        <Section label="Read">
          <CmdButton
            icon={Gauge}
            label="Status"
            busy={busy === "status"}
            onClick={() => void run("status")}
            hint={t("ask_the_bot_for_its_current")}
          />
          <CmdButton
            icon={History}
            label="History"
            busy={busy === "history"}
            onClick={() => void run("history", { days: 1 })}
            hint={t("the_bots_own_trade_history_for_the_last_24_hours")}
          />
        </Section>

        <Section label="Run">
          <CmdButton
            icon={Play}
            tone="up"
            label="Start"
            busy={busy === "start"}
            onClick={() =>
              setConfirm({
                command: "start",
                params: {},
                label: t("start_the_strategy"),
                detail:
                  "The bot begins quoting with whatever strategy is currently loaded. It will place real orders.",
              })
            }
            hint={t("start_the_loaded_strategy")}
          />
          <CmdButton
            icon={CircleStop}
            tone="down"
            label="Stop"
            busy={busy === "stop"}
            onClick={() =>
              setConfirm({
                command: "stop",
                params: { skip_order_cancellation: false },
                label: t("stop_the_strategy"),
                detail:
                  "The bot stops quoting and cancels its resting orders. Any inventory it is holding stays as it is.",
              })
            }
            hint={t("stop_the_strategy_and_cancel_its_orders")}
          />
        </Section>

        <Section label="Change">
          <FormButton
            icon={Blocks}
            label={t("import_strategy")}
            open={form === "import"}
            onToggle={() => setForm(form === "import" ? null : "import")}
          />
          <FormButton
            icon={Settings2}
            label={t("set_parameters")}
            open={form === "config"}
            onToggle={() => setForm(form === "config" ? null : "config")}
          />
          <FormButton
            icon={Coins}
            label={t("balance_limits")}
            open={form === "balance_limit"}
            onToggle={() => setForm(form === "balance_limit" ? null : "balance_limit")}
          />
          <FormButton
            icon={Sparkles}
            label={tCommon("paper_balance")}
            open={form === "balance_paper"}
            onToggle={() => setForm(form === "balance_paper" ? null : "balance_paper")}
          />
        </Section>

        {form === "import" && (
          <ImportForm
            busy={busy === "import"}
            onSubmit={(strategy) =>
              setConfirm({
                command: "import",
                params: { strategy },
                label: t("load", { strategy: String(strategy) }),
                detail:
                  "The bot loads a different strategy file. If it is currently running, stop it first — importing under a live strategy is undefined.",
              })
            }
          />
        )}
        {form === "config" && (
          <ConfigForm
            busy={busy === "config"}
            onSubmit={(key, value) =>
              setConfirm({
                command: "config",
                params: { params: [[key, value]] },
                label: t("set_to", { key: String(key), value: String(value) }),
                detail:
                  "This changes how the running bot trades, immediately. Get it wrong and it quotes at the wrong price with real money.",
              })
            }
          />
        )}
        {form === "balance_limit" && (
          <BalanceForm
            withExchange
            busy={busy === "balance_limit"}
            onSubmit={(fields) =>
              setConfirm({
                command: "balance_limit",
                params: fields,
                label: t("limit_to", { asset: String(fields.asset), amount: String(fields.amount) }),
                detail:
                  "Caps how much of this asset the bot will use on that exchange. It does not move funds.",
              })
            }
          />
        )}
        {form === "balance_paper" && (
          <BalanceForm
            busy={busy === "balance_paper"}
            onSubmit={(fields) =>
              setConfirm({
                command: "balance_paper",
                params: fields,
                label: t("paper_balance_1", { asset: String(fields.asset), amount: String(fields.amount) }),
                detail:
                  "Only affects paper-trading mode. It has no effect on a bot trading live.",
              })
            }
          />
        )}

        {/* What happened. Newest last, because it reads as a transcript of the
            conversation the operator is having with their bot. */}
        {lines.length > 0 && (
          <div className="border-t border-border">
            <div className="border-b border-border bg-surface-2 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Replies
            </div>
            {lines.map((l, i) => (
              <div key={`${l.at}-${i}`} className="flex gap-2 px-3 py-1.5">
                {l.ok ? (
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                )}
                <div className="min-w-0">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    {l.command}
                  </span>
                  <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground">
                    {l.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirm && (
        <ConfirmBar
          label={confirm.label}
          detail={confirm.detail}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const c = confirm;
            setConfirm(null);
            setForm(null);
            void run(c.command, c.params);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ outcome */

/**
 * One sentence for what came back.
 *
 * The four failure classes are genuinely different actions, so they get
 * genuinely different words. `AGENT_OFFLINE` means look at your own machine;
 * `NOT_SUBSCRIBED` means look at conf_client.yml; `BOT_TIMEOUT` means look at the
 * bot's log; a `status >= 400` body means the bot understood and declined.
 */
function describeOutcome(command: BotCommand, res: CommandOutcome): string {
  if (res.ok) {
    const d = res.data;
    if (d && typeof d === "object") {
      // `status` answers in `data`, `history` in `trades`, most others in `msg`.
      if (typeof d.data === "string" && d.data.trim()) return d.data.trim();
      if (Array.isArray(d.trades)) {
        return d.trades.length
          ? `${d.trades.length} trade(s) returned.`
          : "No trades in that window.";
      }
      if (Array.isArray(d.changes) && d.changes.length) {
        return d.changes.map((c: any) => `${c[0]} → ${c[1]}`).join(", ");
      }
      if (typeof d.msg === "string" && d.msg.trim()) return d.msg.trim();
    }
    return `${command} accepted.`;
  }

  switch (res.code) {
    case "AGENT_OFFLINE":
      return "No agent is connected. Start it on the machine running the bot.";
    case "NO_INSTANCE":
      return res.error || "The agent is running but no bot has connected to it.";
    case "NOT_SUBSCRIBED":
      return res.error || "The bot is not listening for commands (mqtt_commands: false).";
    case "BOT_TIMEOUT":
      return res.error || "The bot accepted the command but never answered. Check its own log.";
    case "TIMEOUT":
      return "No answer in time. The command may still have reached the bot — check the log before retrying.";
    case "RELAY_UNAVAILABLE":
      return res.error || "The agent is connected to a different worker and cannot be reached.";
    case "CLOSED":
      return "The connection closed before an answer arrived.";
    default:
      return res.error || "The command failed.";
  }
}

/* ------------------------------------------------------------------- pieces */

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-border">
      <div className="border-b border-border bg-surface-2 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5 p-2">{children}</div>
    </div>
  );
}

function CmdButton({
  icon: Icon,
  label,
  hint,
  busy,
  tone,
  onClick,
}: {
  icon: typeof Play;
  label: string;
  hint: string;
  busy?: boolean;
  tone?: "up" | "down";
  onClick: () => void;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={hint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60",
        tone === "up" && "border-up/30 bg-up/10 text-foreground hover:bg-up/20",
        tone === "down" && "border-down/30 bg-down/10 text-foreground hover:bg-down/20",
        !tone && "border-border bg-card text-foreground hover:bg-surface-3"
      )}
    >
      <Icon className={cn("h-3 w-3", busy && "animate-pulse")} />
      {busy ? `${tCommon("waiting")}…` : label}
    </button>
  );
}

function FormButton({
  icon: Icon,
  label,
  open,
  onToggle,
}: {
  icon: typeof Play;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
        open
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border bg-card text-foreground hover:bg-surface-3"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
      <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
    </button>
  );
}

const inputClass =
  "min-w-0 flex-1 rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] text-foreground placeholder:text-subtle-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring";
const submitClass =
  "shrink-0 rounded border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-3 disabled:opacity-50";

function ImportForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (strategy: string) => void;
}) {
  const t = useTranslations("components");
  const [value, setValue] = useState("");
  return (
    <FormRow
      hint={t("the_file_name_only_as_it")}
    >
      <input
        className={inputClass}
        placeholder="my-bot.yml"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className={submitClass}
        disabled={busy || !value.trim()}
        onClick={() => onSubmit(value.trim())}
      >
        Import
      </button>
    </FormRow>
  );
}

function ConfigForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (key: string, value: string) => void;
}) {
  const t = useTranslations("components");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  return (
    <FormRow hint={t("one_strategy_parameter_at_a_time")}>
      <input
        className={inputClass}
        placeholder="bid_spread"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="0.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className={submitClass}
        disabled={busy || !key.trim() || !value.trim()}
        onClick={() => onSubmit(key.trim(), value.trim())}
      >
        Apply
      </button>
    </FormRow>
  );
}

function BalanceForm({
  busy,
  withExchange,
  onSubmit,
}: {
  busy: boolean;
  withExchange?: boolean;
  onSubmit: (fields: Record<string, any>) => void;
}) {
  const t = useTranslations("components");
  const [exchange, setExchange] = useState("bicrypto");
  const [asset, setAsset] = useState("");
  const [amount, setAmount] = useState("");
  const valid = asset.trim() && amount.trim() && (!withExchange || exchange.trim());
  return (
    <FormRow
      hint={
        withExchange
          ? t("caps_how_much_of_an_asset")
          : t("only_affects_paper_trading_mode")
      }
    >
      {withExchange && (
        <input
          className={inputClass}
          placeholder="bicrypto"
          value={exchange}
          onChange={(e) => setExchange(e.target.value)}
        />
      )}
      <input
        className={inputClass}
        placeholder="USDT"
        value={asset}
        onChange={(e) => setAsset(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="1000"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button
        type="button"
        className={submitClass}
        disabled={busy || !valid}
        onClick={() =>
          onSubmit(
            withExchange
              ? { exchange: exchange.trim(), asset: asset.trim(), amount: Number(amount) }
              : { asset: asset.trim(), amount: Number(amount) }
          )
        }
      >
        Set
      </button>
    </FormRow>
  );
}

function FormRow({ hint, children }: { hint: string; children: ReactNode }) {
  return (
    <div className="border-b border-border bg-surface-2/40 px-2 py-2">
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * The confirmation step.
 *
 * A bar rather than a modal dialog, on purpose: this panel lives inside a
 * maximizable terminal panel, and a portalled dialog opened from in here would be
 * covered by a maximized panel (`fixed inset-0 z-50`) — the same interlock the
 * emergency stop has to dispatch an event to work around. In-flow is simpler and
 * cannot be occluded.
 */
function ConfirmBar({
  label,
  detail,
  onConfirm,
  onCancel,
}: {
  label: string;
  detail: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("components");
  return (
    <div className="shrink-0 border-t border-warning/40 bg-warning/10 p-2.5">
      <p className="flex items-start gap-1.5 text-[11px] font-semibold text-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
        {label}
      </p>
      <p className="mt-1 pl-5 text-[10px] leading-relaxed text-muted-foreground">{detail}</p>
      <div className="mt-2 flex gap-1.5 pl-5">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded border border-warning/40 bg-card px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-3"
        >
          {t("do_it")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-3"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
