import SupportDeskClient from "./client";

export const metadata = {
  title: "Support Desk",
};

/**
 * NO `PageShell`, no container, no KPI band — and that is the point.
 *
 * ---------------------------------------------------------------------------
 * THIS ROUTE IS A CONSOLE, NOT A PAGE
 * ---------------------------------------------------------------------------
 * It used to be a hero band, five stat cards and a paged DataTable of tickets:
 * a screen you READ, whose only verb was "leave for `[id]`". Answering one
 * customer cost two full page navigations, and the operator lost the queue in
 * between both times.
 *
 * It is now the same three-pane shape as the AI console's Live Inbox — the
 * queue, the conversation, the case — because that is what the work is. Every
 * pane is sized against the viewport, so every row of page furniture above them
 * would come straight out of the conversation.
 *
 * The table is not gone. It moved to `/admin/crm/support/tickets` with its
 * analytics, its bulk verbs, its export and its filters intact, and the console's
 * bar links to it. A console shows the work in front of you; a table is the
 * archive, and the two want opposite frames.
 *
 * The admin layout lists this route in its `CHROMELESS` set, so there is no site
 * header and no footer to work around — and therefore NO `pt-header` either.
 * Hiding chrome without reclaiming its space is the documented failure mode. The
 * client is an `EditorShell`: a 48px bar carrying the back arrow (the only way
 * out once the navbar is gone), the title, the live indicator and the link to
 * the archive, over exactly one viewport of console.
 */
export default function AdminSupportPage() {
  return <SupportDeskClient />;
}
