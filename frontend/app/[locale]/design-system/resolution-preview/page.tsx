"use client";

import { useState } from "react";
import { ResolutionPane, CollapsedPaneRail } from "@/components/support/resolution-pane";
import { MessageBubble } from "@/components/support/message-bubble";
import { EditorThemeToggle } from "@/components/layout/editor-theme-toggle";
import {
  CasePane,
  type CaseTab,
} from "@/app/[locale]/(ext)/admin/ai/support/inbox/case-pane";
import { readResolution } from "@/lib/support/resolution";
import { toThread } from "@/lib/support/messages";
import type { PaneTab } from "@/components/support/resolution-pane";

/**
 * THROWAWAY. A rendering harness for the ticket page's resolution pane.
 *
 * The pane's states are driven by the SHAPE of a transcript — how many
 * citations, whether any action is blocked, whether a human took over — and the
 * only way to see all of them on the real page is to find four different
 * tickets on a seeded database. This puts them side by side.
 *
 * Delete when the pane is settled, or keep it next to the kitchen sink.
 */

const FULL = [
  {
    key: "m1",
    type: "client",
    text: "I requested a withdrawal of 2,400.00 USDT to my bank account on Monday and it still has not arrived.",
    time: "2026-08-03T09:12:00.000Z",
    userId: "u1",
  },
  {
    key: "m2",
    type: "agent",
    ai: true,
    turnId: "t1",
    text: "Bank withdrawals settle in 1-3 business days after the on-chain leg completes. The transaction showing as completed refers to the platform leg only.",
    time: "2026-08-03T09:15:00.000Z",
    citations: [
      {
        sourceId: "help-wd-1",
        url: "/help/withdrawals/bank-transfer-timing",
        title: "Why a bank withdrawal takes 1-3 business days",
        quote:
          "The on-chain leg and the bank leg settle separately. Once a payout is marked complete, the funds are with our payout partner — your bank then posts them on its own schedule.",
      },
      {
        sourceId: "help-wd-2",
        url: "/help/withdrawals/completed-status",
        title: "What “Completed” means on a withdrawal record",
        quote:
          "Completed refers to the platform leg only. It confirms the funds left your account and were handed to the payout provider. It is not confirmation that your bank has credited them.",
      },
    ],
    actions: [
      { label: "Check withdrawal status", url: "/finance/wallet/withdraw" },
    ],
    steps: {
      title: "If it still has not arrived",
      steps: [
        { n: 1, text: "Open your withdrawal history", url: "/finance/history" },
        { n: 2, text: "Confirm the beneficiary name matches your verified name" },
        {
          n: 3,
          text: "Raise a trace with your bank",
          blocked: "verification_required",
        },
      ],
    },
  },
  {
    key: "m3",
    type: "agent",
    system: true,
    ai: true,
    text: "This conversation has been passed to the support team. Someone will reply here.",
    time: "2026-08-04T11:20:00.000Z",
  },
  {
    // The regression case: a notice long enough that `shrink-0` on the text
    // used to make the whole thread column wider than the viewport.
    key: "m3b",
    type: "agent",
    system: true,
    text: "Fees depend on the currency and the network you're using, so there isn't one number I can quote you. You'll see the exact fee for your withdrawal on the Withdraw page before you confirm it.",
    time: "2026-08-04T11:21:00.000Z",
  },
  {
    key: "m4",
    type: "agent",
    text: "Thanks for your patience. The transfer was returned by the intermediary bank because the beneficiary name did not match the account. I have credited the 2,400.00 USDT back to your spot wallet.",
    time: "2026-08-04T11:26:00.000Z",
    agentProfile: { firstName: "Daniel", lastName: "Reyes" },
  },
];

const FLOOR = [
  {
    key: "n1",
    type: "client",
    text: "I paid with my card 20 minutes ago and the balance has not changed.",
    time: "2026-08-05T12:41:00.000Z",
    userId: "u1",
  },
];

const TICKET = {
  id: "a5b46df2-c4e7-4589-a946-f1e3a3b60739",
  status: "OPEN",
  importance: "HIGH",
  tags: ["withdrawal", "bank-transfer"],
  responseTime: 3,
  satisfaction: null,
  createdAt: "2026-08-03T09:12:00.000Z",
  updatedAt: "2026-08-05T12:37:00.000Z",
  agentId: "agent-1",
};

/**
 * Is the AI Support addon actually here?
 *
 * `case-pane` lives under `(ext)/`, so it is the only part of this harness that
 * a licence can be without. On an install that lacks it, `next.config.js`
 * aliases the import onto a generated stub — that is what keeps the BUILD
 * alive, and the stub renders nothing. Four empty frames under captions
 * promising an operator pane read as a regression in the pane itself, so the
 * section says what it is instead. `__isStub` is stamped by every stub in
 * `lib/stubs/`.
 */
const CASE_PANE_INSTALLED = !(CasePane as any)?.__isStub;

const SESSION = {
  active: false,
  state: "HUMAN_ACTIVE",
  label: null,
  enabled: true,
  waitingForHuman: true,
  humanActive: true,
  persona: { name: "Aria", avatar: null, disclosure: "" },
};

function Case({
  label,
  note,
  wide,
  children,
}: {
  label: string;
  note: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-subtle-foreground mb-1 font-mono text-[11px] tracking-wider uppercase">
        {label}
      </p>
      <p className="text-muted-foreground mb-3 text-xs">{note}</p>
      {/* `w-96` for every case, deliberately: both shipped panes are one fixed
          width now, and a harness that still showed two would be advertising a
          layout shift that no longer exists. `wide` is kept as a caption hint
          only. */}
      <div className="border-border bg-card/40 flex h-[680px] w-96 flex-col overflow-hidden border">
        {children}
      </div>
    </div>
  );
}

/** An escalated conversation as the operator inbox receives it. */
const ADMIN_DETAIL = {
  ticket: {
    id: "a5b46df2-c4e7-4589-a946-f1e3a3b60739",
    subject: "Withdrawal to my bank has not arrived",
    status: "OPEN",
    importance: "HIGH",
    type: "TICKET",
    createdAt: "2026-08-03T09:12:00.000Z",
    customer: {
      id: "cust-1",
      name: "Amara Okonkwo",
      email: "amara@example.com",
      avatar: "",
    },
  },
  messages: [],
  persona: { name: "Aria", avatar: null, disclosure: "" },
  session: {
    id: "sess-1",
    state: "HUMAN_REQUESTED",
    stateLabel: "Waiting for a person",
    escalationReason: "operator_policy_undocumented:payout_returns",
    turnCount: 4,
    costUsd: 0.0231,
    humanAgentId: null,
    locale: "en",
    channel: "TICKET",
    handoverSummary:
      "Wants: confirmation of where a 2,400.00 USDT bank withdrawal went.\nEstablished: the platform leg completed Monday; the payout partner shows it left.\nBlocking: reading the payout record needs account access the assistant does not have.\n--- suggested reply ---\nThanks for your patience Amara. I have pulled the payout record — [confirm what the record shows] — and I will come back to you today.",
  },
  draft: null,
  retrieved: [
    {
      id: "c1",
      breadcrumb: "Help · Withdrawals",
      title: "Why a bank withdrawal takes 1-3 business days",
      url: "/help/withdrawals/bank-transfer-timing",
      preview:
        "The on-chain leg and the bank leg settle separately. Once a payout is marked complete, the funds are with our payout partner — your bank then posts them on its own schedule.",
    },
    {
      id: "c2",
      breadcrumb: "Help · Withdrawals",
      title: "What Completed means on a withdrawal record",
      url: "/help/withdrawals/completed-status",
      preview:
        "Completed refers to the platform leg only. It is not confirmation that your bank has credited them.",
    },
  ],
  turns: [
    {
      id: "t1",
      status: "ANSWERED",
      verdict: "answered",
      skipReason: null,
      escalationReason: null,
      model: "claude-sonnet-5",
      costUsd: 0.0089,
      retrievalScore: 0.71,
      groundedness: 0.31,
      latencyMs: 2140,
      wasSent: true,
      createdAt: "2026-08-03T09:15:00.000Z",
    },
    {
      id: "t2",
      status: "ESCALATED",
      verdict: "escalated",
      skipReason: null,
      escalationReason: "operator_policy_undocumented:payout_returns",
      model: "claude-sonnet-5",
      costUsd: 0.0142,
      retrievalScore: null,
      groundedness: null,
      latencyMs: 1880,
      wasSent: false,
      createdAt: "2026-08-04T11:20:00.000Z",
    },
  ],
  handovers: [
    {
      from: "AI_ACTIVE",
      to: "HUMAN_REQUESTED",
      actor: "AI",
      reason: "operator_policy_undocumented",
      note: null,
      at: "2026-08-04T11:20:00.000Z",
    },
  ],
};

export default function ResolutionPreview() {
  const [tab, setTab] = useState<PaneTab>("sources");
  const [adminTab, setAdminTab] = useState<CaseTab>("brief");
  const [floorTab, setFloorTab] = useState<PaneTab>("ticket");
  const [closedTab, setClosedTab] = useState<PaneTab>("ticket");

  const full = readResolution(toThread(FULL));
  const floor = readResolution(toThread(FLOOR));

  return (
    <main className="bg-background min-h-screen p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold">Resolution pane</h1>
          <p className="text-muted-foreground text-sm">
            Every state the ticket page can put this column in.
          </p>
        </div>
        {/* The same control the chromeless support routes carry. Both panes
            have to be judged in both themes, so it belongs on the harness. */}
        <EditorThemeToggle />
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <Case
          label="With a resolution"
          note="tabs are count-gated · handover is a state"
          wide
        >
          <ResolutionPane
            ticket={TICKET as never}
            model={full}
            loading={false}
            agentName="Daniel Reyes"
            wsConnected
            aiSession={SESSION as never}
            tab={tab}
            onTabChange={setTab}
            onCollapse={() => undefined}
            onSatisfaction={() => undefined}
          />
        </Case>

        <Case
          label="The floor"
          note="one message, no AI, no agent — no tab bar, same width"
        >
          <ResolutionPane
            ticket={{ ...TICKET, agentId: null, tags: [], responseTime: null, status: "PENDING" } as never}
            model={floor}
            loading={false}
            agentName={null}
            wsConnected={false}
            aiSession={null}
            tab={floorTab}
            onTabChange={setFloorTab}
            onCollapse={() => undefined}
          />
        </Case>

        <Case label="Loading" note="frame at rest, contents pending">
          <ResolutionPane
            ticket={null}
            model={floor}
            loading
            agentName={null}
            wsConnected={false}
            aiSession={null}
            tab="ticket"
            onTabChange={() => undefined}
          />
        </Case>

        <Case label="Closed" note="the rating becomes an ask, not a readout">
          <ResolutionPane
            ticket={{ ...TICKET, status: "CLOSED" } as never}
            model={floor}
            loading={false}
            agentName="Daniel Reyes"
            wsConnected={false}
            aiSession={SESSION as never}
            tab={closedTab}
            onTabChange={setClosedTab}
            onSatisfaction={() => undefined}
          />
        </Case>

        <div>
          <p className="text-subtle-foreground mb-1 font-mono text-[11px] tracking-wider uppercase">
            Collapsed
          </p>
          <p className="text-muted-foreground mb-3 text-xs">44px, keeps the counts</p>
          <div className="border-border flex h-[680px] border">
            <CollapsedPaneRail model={full} onExpand={() => undefined} />
          </div>
        </div>
      </div>

      {/* ---- the operator's sibling ------------------------------------
          Same frame, same hairlines, same count-gated tabs; operator content.
          Side by side with the customer's above so the two cannot drift. */}
      <h2 className="mt-12 mb-1 text-lg font-semibold">
        Case pane — the operator side
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        /admin/ai/support/inbox. The custody block is the floor and never
        collapses.
      </p>
      {!CASE_PANE_INSTALLED && (
        <div className="border-border text-muted-foreground mb-6 border border-dashed p-4 text-sm">
          The AI Support addon is not installed here, so the operator pane has
          nothing to draw. The customer pane above is core and unaffected.
        </div>
      )}
      {CASE_PANE_INSTALLED && (
        <div className="flex flex-wrap items-start gap-8">
          <Case
            label="Escalated to you"
            note="brief + evidence + desk controls"
            wide
          >
            <CasePane
              detail={ADMIN_DETAIL as never}
              loading={false}
              currentUserId="op-1"
              tab={adminTab}
              onTabChange={setAdminTab}
              busy={null}
              can={{ manage: true, teach: true }}
              onTakeover={() => undefined}
              onRelease={() => undefined}
              onUseDraft={() => undefined}
              onStatus={() => undefined}
              onPriority={() => undefined}
              onAssignToMe={() => undefined}
              onTeach={() => undefined}
              onCollapse={() => undefined}
            />
          </Case>

          <Case
            label="Another agent has it"
            note="the collision this screen could not show before"
          >
            <CasePane
              detail={
                {
                  ...ADMIN_DETAIL,
                  session: { ...ADMIN_DETAIL.session, humanAgentId: "someone-else" },
                  retrieved: [],
                  turns: [],
                } as never
              }
              loading={false}
              currentUserId="op-1"
              tab="case"
              onTabChange={() => undefined}
              busy={null}
              can={{ manage: true, teach: false }}
              onTakeover={() => undefined}
              onRelease={() => undefined}
              onUseDraft={() => undefined}
              onStatus={() => undefined}
              onPriority={() => undefined}
              onAssignToMe={() => undefined}
              onTeach={() => undefined}
            />
          </Case>

          <Case label="No assistant session" note="the floor — no tabs, no invention">
            <CasePane
              detail={
                {
                  ticket: ADMIN_DETAIL.ticket,
                  messages: [],
                  persona: ADMIN_DETAIL.persona,
                  session: null,
                  draft: null,
                  retrieved: [],
                  turns: [],
                } as never
              }
              loading={false}
              currentUserId="op-1"
              tab="case"
              onTabChange={() => undefined}
              busy={null}
              can={{ manage: true, teach: false }}
              onTakeover={() => undefined}
              onRelease={() => undefined}
              onUseDraft={() => undefined}
              onStatus={() => undefined}
              onPriority={() => undefined}
              onAssignToMe={() => undefined}
              onTeach={() => undefined}
            />
          </Case>

          <Case label="View-only agent" note="write controls hidden, not disabled">
            <CasePane
              detail={ADMIN_DETAIL as never}
              loading={false}
              currentUserId="op-2"
              tab="case"
              onTabChange={() => undefined}
              busy={null}
              can={{ manage: false, teach: false }}
              onTakeover={() => undefined}
              onRelease={() => undefined}
              onUseDraft={() => undefined}
              onStatus={() => undefined}
              onPriority={() => undefined}
              onAssignToMe={() => undefined}
              onTeach={() => undefined}
            />
          </Case>
        </div>
      )}

      {/* The shared bubble on both axes, side by side — this is the change with
          three consumers, so the two must be compared directly. */}
      <h2 className="mt-12 mb-1 text-lg font-semibold">The shared bubble</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Same component, same message. `decorations` is the only difference.
      </p>
      <div className="flex flex-wrap items-start gap-10">
        <div className="min-w-0 max-w-2xl flex-1">
          <p className="text-subtle-foreground mb-3 font-mono text-[11px] tracking-wider uppercase">
            inline — the widget and the admin thread
          </p>
          <div className="border-border space-y-5 border p-4">
            <MessageBubble message={toThread(FULL)[1]} isOwn={false} />
            <MessageBubble message={toThread(FULL)[2]} isOwn={false} />
            <MessageBubble message={toThread(FULL)[3]} isOwn={false} />
          </div>
        </div>
        <div className="min-w-0 max-w-2xl flex-1">
          <p className="text-subtle-foreground mb-3 font-mono text-[11px] tracking-wider uppercase">
            reference — the ticket page
          </p>
          <div className="border-border space-y-5 border p-4">
            <MessageBubble
              message={toThread(FULL)[1]}
              isOwn={false}
              decorations="reference"
              onOpenReferences={() => undefined}
            />
            <MessageBubble
              message={toThread(FULL)[2]}
              isOwn={false}
              decorations="reference"
              onOpenReferences={() => undefined}
            />
            <MessageBubble
              message={toThread(FULL)[3]}
              isOwn={false}
              decorations="reference"
              onOpenReferences={() => undefined}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
