"use client";

/**
 * The on-chain hash of a transaction, rendered as the two things a user ever
 * does with one: copy it, and open it on a block explorer.
 *
 * A withdrawal's hash is its receipt — the only evidence, outside our own
 * database, that the money actually left. It was recorded on every ecosystem
 * withdrawal from the day the queue was written (`transaction.trxId`) and
 * returned by the user-facing API all along, but it had never been rendered
 * anywhere a user could see: the finance history table showed `referenceId`
 * (our internal id, which no explorer knows) and the hash appeared only in the
 * admin panel, as plain unlinked text.
 *
 * NO LINK IS A VALID STATE. `getExplorerTxUrl` returns null for a chain we have
 * no explorer for — a custom chain, an exchange network code we do not map, a
 * fiat payout reference that is not a hash at all. In that case the hash is
 * still shown and still copyable; only the anchor is dropped. Rendering a
 * guessed explorer link instead would send the user to a page reading "this
 * transaction does not exist", which is worse than the absence of a link.
 */

import React from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getExplorerTxUrl,
  shortenHash,
} from "@/lib/blockchain-explorer";

interface TransactionHashProps {
  /** The hash itself — `transaction.trxId`. */
  hash?: string | null;
  /**
   * Chain label. Accepts the platform symbol ecosystem withdrawals record
   * ("ETH", "TRON") or the exchange network code spot withdrawals record
   * ("ERC20", "TRC20"); `getExplorerTxUrl` resolves both.
   */
  chain?: string | null;
  /** Network within the chain ("sepolia", "shasta"). Defaults to mainnet. */
  network?: string | null;
  /**
   * Explorer base recorded on the row, for operator-defined custom chains whose
   * explorer no compiled-in table can know. Wins over the built-in lookup.
   */
  explorerUrl?: string | null;
  /** Elide the middle of the hash. Off for detail panes with room for it. */
  truncate?: boolean;
  /** Characters kept at each end when truncating. */
  lead?: number;
  tail?: number;
  className?: string;
}

export function TransactionHash({
  hash,
  chain,
  network,
  explorerUrl: explorerBase,
  truncate = true,
  lead = 10,
  tail = 8,
  className,
}: TransactionHashProps) {
  const tCommon = useTranslations("common");
  const [copied, setCopied] = React.useState(false);

  const value = typeof hash === "string" ? hash.trim() : "";
  const explorerUrl = getExplorerTxUrl(chain, value, network, explorerBase);

  const handleCopy = React.useCallback(
    (event: React.MouseEvent) => {
      /* The hash is routinely rendered inside a table row that opens a detail
         dialog on click. Without this, copying also navigates. */
      event.stopPropagation();
      event.preventDefault();
      if (!value) return;
      navigator.clipboard?.writeText(value);
      setCopied(true);
      toast.success(tCommon("copied_to_clipboard"));
      window.setTimeout(() => setCopied(false), 1500);
    },
    [value, tCommon]
  );

  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  const display = truncate ? shortenHash(value, lead, tail) : value;

  return (
    <span className={cn("inline-flex items-center gap-1.5 min-w-0", className)}>
      {/* `title` carries the full hash so a truncated one is still readable on
          hover without opening the row. `break-all` matters only in the
          untruncated (detail-pane) case, where a 64-char string would
          otherwise push the panel wider than the viewport. */}
      <span
        className={cn(
          "font-mono text-xs text-foreground",
          truncate ? "truncate" : "break-all"
        )}
        title={value}
      >
        {display}
      </span>

      <button
        type="button"
        onClick={handleCopy}
        aria-label={tCommon("copy")}
        title={tCommon("copy")}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-card text-subtle-foreground transition hover:bg-muted hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3 w-3 text-up" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>

      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          aria-label={tCommon("view_on_explorer")}
          title={tCommon("view_on_explorer")}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary-ink transition hover:bg-primary/20"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </span>
  );
}
