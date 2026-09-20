"use client";

/**
 * The signing review sheet — where consent is actually given.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * AN IN-APP WALLET THAT SIGNS MORE QUIETLY THAN METAMASK IS A DOWNGRADE WEARING
 * BETTER FONTS.
 *
 * The temptation with a built-in wallet is to make signing frictionless,
 * because we control both sides and "the user already trusts us". That reasoning
 * is wrong in the one case that matters: the transaction is composed by an
 * AGGREGATOR and targets a THIRD-PARTY router. Nobody here has read that
 * calldata. So this sheet asks the same question a good external wallet asks,
 * and answers it as well as it honestly can.
 *
 * THREE THINGS IT WILL NOT DO:
 *
 *  1. It will not describe calldata it cannot decode. An unknown selector says
 *     so, in a warning tone. "Contract interaction" beside a green tick is how
 *     wallets teach people to click through anything.
 *  2. It will not truncate an address the user is being asked to VERIFY.
 *     Shortening is for reference, never for the field whose whole purpose is
 *     comparison.
 *  3. It will not render an unlimited approval as a number. Eighty digits reads
 *     as precision; the word "Unlimited" reads as what it is.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FileSignature,
  Fuel,
  Loader2,
  Link2,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WALLET_DIALOG_LAYER } from "./dialog-layer";
import { evmChain } from "@/lib/web3-wallet/chains";
import { decodeCalldata, formatUnits } from "@/lib/web3-wallet/decode-calldata";
import { estimateEvmTransaction } from "@/lib/web3-wallet/signers/evm";
import type { PendingApproval } from "@/lib/web3-wallet/approval";

export function ApprovalDialog({
  approval,
  onApprove,
  onReject,
}: {
  approval: PendingApproval;
  onApprove: () => void;
  onReject: () => void;
}) {
  const t = useTranslations("ext_dex");
  const tCommon = useTranslations("common");
  const [busy, setBusy] = useState(false);
  const request = approval.request;

  return (
    <Dialog open onOpenChange={(next) => !next && onReject()}>
      <DialogContent
        size="md"
        /*
          ══════════════════════════════════════════════════════════════════════
          `[&>*]:min-w-0` — ON THE CHILDREN, AND THAT IS THE WHOLE FIX.

          `DialogContent` is a `grid`, and a grid ITEM defaults to
          `min-width: auto`, which refuses to shrink below its content's
          min-content width. `max-w-md` on the container does not constrain the
          item: the column sizes to the content and everything in it is painted
          OUTSIDE the visible panel.

          Measured, not guessed. With expanded calldata in the row below, a
          448px dialog held a 1392px row and pushed "Grant spending access" and
          the amount 968px past its own right edge — on the last screen a user
          reads before granting spending access. Adding `min-width: 0` to the
          items brought the row to 400px and everything back inside.

          NOT `overflow-hidden`, which was the first attempt: clipping hides the
          values rather than fitting them, so the screen still lies, just more
          quietly. And not `min-w-0` on the container either — the container was
          never the thing that could not shrink.
          ══════════════════════════════════════════════════════════════════════
        */
        className={cn(WALLET_DIALOG_LAYER, "[&>*]:min-w-0")}
        data-testid="wallet-approval-dialog"
      >
        {request.kind === "connect" && <ConnectBody request={request} />}
        {request.kind === "signMessage" && <MessageBody request={request} />}
        {request.kind === "signTypedData" && <TypedDataBody request={request} />}
        {request.kind === "sendTransaction" && (
          <TransactionBody request={request} />
        )}
        {request.kind === "sendAsset" && <AssetBody request={request} />}

        <DialogFooter>
          <Button variant="outline" onClick={onReject} disabled={busy}>
            {tCommon("reject")}
          </Button>
          <Button
            data-testid="wallet-approve"
            onClick={() => {
              setBusy(true);
              onApprove();
            }}
            disabled={busy}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {request.kind === "connect" ? tCommon("connect") : tCommon("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── connect ──────────────────────────────────────────────────────────────── */

function ConnectBody({
  request,
}: {
  request: Extract<PendingApproval["request"], { kind: "connect" }>;
}) {
  const t = useTranslations("ext_dex");
  return (
    <>
      <Header
        icon={<Link2 className="size-5" />}
        title={t("connect_this_wallet")}
        description={t("connect_description")}
      />
      <Row label={t("site")} value={request.origin || t("this_site")} mono />
      {/*
        Stating what connecting CANNOT do is the useful half. Users routinely
        believe that connecting a wallet grants spending access; it does not,
        and the moment to say so is while they are deciding.
      */}
      <p className="rounded bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-subtle-foreground">
        {t("connect_cannot_move_funds")}
      </p>
    </>
  );
}

/* ── message ──────────────────────────────────────────────────────────────── */

function MessageBody({
  request,
}: {
  request: Extract<PendingApproval["request"], { kind: "signMessage" }>;
}) {
  const t = useTranslations("ext_dex");

  /* Hex in `personal_sign` means bytes. Rendering the hex to a user who is
     being asked to read what they are signing is useless, so it is decoded to
     text when it decodes to text, and left alone when it does not. */
  const text = useMemo(() => decodeMessage(request.message), [request.message]);

  return (
    <>
      <Header
        icon={<FileSignature className="size-5" />}
        title={t("sign_this_message")}
        description={t("sign_message_description")}
      />
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-surface-3 p-3 font-mono text-[11px] leading-relaxed">
        {text}
      </pre>
      <Row label={t("signing_with")} value={request.address} mono />
    </>
  );
}

/* ── typed data ───────────────────────────────────────────────────────────── */

function TypedDataBody({
  request,
}: {
  request: Extract<PendingApproval["request"], { kind: "signTypedData" }>;
}) {
  const t = useTranslations("ext_dex");
  const tCommon = useTranslations("common");
  const domain = (request.typedData.domain ?? {}) as Record<string, unknown>;
  const primaryType = String(request.typedData.primaryType ?? "—");
  const message = (request.typedData.message ?? {}) as Record<string, unknown>;

  /*
    A PERMIT IS AN APPROVAL WITHOUT A TRANSACTION, and it is the typed-data
    payload most worth calling out. A user who has learned to be careful about
    `approve` has no reason to suspect a "signature" — which is precisely why
    permit-based drainers work.
  */
  const isPermit = /permit/i.test(primaryType);

  return (
    <>
      <Header
        icon={<FileSignature className="size-5" />}
        title={t("sign_typed_data")}
        description={t("sign_typed_data_description")}
        tone={isPermit ? "warning" : "default"}
      />
      {isPermit && (
        <Warning>{t("permit_grants_spending_without_a_transaction")}</Warning>
      )}
      <Row label={tCommon("type")} value={primaryType} />
      {typeof domain.name === "string" && (
        <Row label={tCommon("contract")} value={String(domain.name)} />
      )}
      {/* Same reasoning as the calldata block: a long unbroken value in typed
          data would otherwise widen the whole dialog. */}
      <pre className="max-h-48 min-w-0 overflow-y-auto whitespace-pre-wrap break-all rounded border border-border bg-surface-3 p-3 font-mono text-[11px] leading-relaxed">
        {JSON.stringify(message, jsonSafe, 2)}
      </pre>
      <Row label={t("signing_with")} value={request.address} mono />
    </>
  );
}

/* ── transaction ──────────────────────────────────────────────────────────── */

function TransactionBody({
  request,
}: {
  request: Extract<PendingApproval["request"], { kind: "sendTransaction" }>;
}) {
  const t = useTranslations("ext_dex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const chain = evmChain(request.chainId);
  const native = chain?.nativeCurrency;
  const decoded = useMemo(
    () => decodeCalldata(request.transaction.data),
    [request.transaction.data]
  );

  const [fee, setFee] = useState<bigint | null>(null);
  const [feeFailed, setFeeFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    /* Estimated with NO key — the user has not agreed to anything yet. See
       `estimateEvmTransaction`. */
    estimateEvmTransaction(request.transaction, request.chainId, request.address)
      .then((result) => !cancelled && setFee(result.totalWei))
      .catch(() => !cancelled && setFeeFailed(true));
    return () => {
      cancelled = true;
    };
  }, [request.transaction, request.chainId, request.address]);

  const value = safeBigInt(request.transaction.value);
  const hasData = Boolean(
    request.transaction.data && request.transaction.data !== "0x"
  );

  return (
    <>
      <Header
        icon={<Wallet className="size-5" />}
        title={tExt("confirm_transaction")}
        description={chain?.name ?? `${tExt("chain")} ${request.chainId}`}
        tone={decoded?.kind === "approve" && decoded.unlimited ? "warning" : "default"}
      />

      {decoded?.kind === "approve" && decoded.unlimited && (
        <Warning>{t("unlimited_approval_warning")}</Warning>
      )}
      {hasData && !decoded && (
        // Honest ignorance beats a reassuring label. See the file header.
        <Warning tone="muted">{t("cannot_decode_this_transaction")}</Warning>
      )}

      {decoded?.kind === "approve" && (
        <>
          <Row label={tCommon("action")} value={decoded.revoke ? t("revoke_access") : t("grant_spending_access")} />
          <Row
            label={tCommon("amount")}
            value={
              decoded.unlimited
                ? tCommon("unlimited")
                : formatUnits(decoded.amount, 18)
            }
            emphasis={decoded.unlimited}
          />
          {/* NOT shortened — this is the address being verified. */}
          <Row label={t("spender")} value={decoded.spender} mono />
        </>
      )}

      {decoded?.kind === "transfer" && (
        <>
          <Row label={tCommon("action")} value={t("token_transfer")} />
          <Row label={t("recipient")} value={decoded.to} mono />
        </>
      )}

      {decoded?.kind === "unwrap" && <Row label={tCommon("action")} value={tExt("unwrap")} />}
      {decoded?.kind === "wrap" && <Row label={tCommon("action")} value={tExt("wrap")} />}

      {request.transaction.to && (
        <Row label={tCommon("to")} value={request.transaction.to} mono />
      )}

      {value > BigInt(0) && native && (
        <Row
          label={tCommon("amount")}
          value={`${formatUnits(value, native.decimals)} ${native.symbol}`}
          emphasis
        />
      )}

      <div className="flex min-w-0 items-center justify-between rounded bg-surface-2 px-3 py-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-subtle-foreground">
          <Fuel className="size-3" />
          {t("network_fee_estimate")}
        </span>
        <span className="font-mono">
          {feeFailed || !native
            ? "—"
            : fee === null
              ? t("estimating")
              : `${formatUnits(fee, native.decimals, 8)} ${native.symbol}`}
        </span>
      </div>

      {hasData && (
        <details className="min-w-0 rounded border border-border bg-surface-3">
          <summary className="cursor-pointer px-3 py-2 text-[11px] text-subtle-foreground">
            {t("raw_transaction_data")}
          </summary>
          {/*
            ══════════════════════════════════════════════════════════════════
            `whitespace-pre-wrap` IS WHAT MAKES `break-all` DO ANYTHING HERE.

            A `<pre>` is `white-space: pre` by default, which forbids wrapping
            outright — so `break-all` on its own was inert and calldata rendered
            as ONE unbroken line a few thousand characters wide.

            That is not merely ugly. A flex child's default `min-width: auto`
            means it cannot shrink below its content, so the line forced the
            whole dialog column wider than the dialog, and the `justify-between`
            rows above stretched with it: "Grant spending access" and the amount
            were pushed clean off the right-hand edge of the box, on the last
            screen a user reads before granting spending access. `min-w-0` on the
            column is the other half of the fix.

            WRAPPED RATHER THAN LEFT TO SCROLL. Horizontal scroll inside a modal
            hides the tail of the very field this block exists to expose, and a
            user checking calldata is checking the END of it — the amount and
            the spender live there.
            ══════════════════════════════════════════════════════════════════
          */}
          <pre className="max-h-40 min-w-0 overflow-y-auto whitespace-pre-wrap break-all px-3 pb-3 font-mono text-[10px] leading-relaxed">
            {request.transaction.data}
          </pre>
        </details>
      )}
    </>
  );
}

/* ── a plain transfer on a non-EVM chain ──────────────────────────────────── */

/**
 * There is nothing opaque to decode here, so the sheet says what is happening.
 *
 * The EVM sheet's job is to admit when it cannot read calldata. This one has no
 * calldata: the whole operation is "move N of X to Y", and dressing that up as
 * a contract interaction would be less honest, not more careful.
 */
function AssetBody({
  request,
}: {
  request: Extract<PendingApproval["request"], { kind: "sendAsset" }>;
}) {
  const t = useTranslations("ext_dex");
  const tCommon = useTranslations("common");
  const amount = formatUnits(safeBigInt(request.amount), request.decimals);

  return (
    <>
      <Header
        icon={<Wallet className="size-5" />}
        title={t("confirm_transfer")}
        description={VM_LABEL[request.vm] ?? request.vm}
      />

      {/*
        SOLANA'S RENT ASYMMETRY, STATED BEFORE IT IS SPENT. Sending a token to
        someone who has never held it creates their token account, and the
        SENDER pays the rent. No other chain here behaves this way.
      */}
      {request.createsTokenAccount && (
        <Warning tone="muted">{t("creates_token_account_note")}</Warning>
      )}

      <Row label={tCommon("amount")} value={`${amount} ${request.symbol}`} emphasis />
      {/* NOT shortened — this is the address being verified. */}
      <Row label={t("recipient")} value={request.to} mono />
      <Row label={t("signing_with")} value={request.address} mono />

      <div className="flex items-center justify-between rounded bg-surface-2 px-3 py-2 text-[11px]">
        <span className="flex items-center gap-1.5 text-subtle-foreground">
          <Fuel className="size-3" />
          {t("network_fee_estimate")}
        </span>
        <span className="font-mono">
          {/* TRON has no honest number to show here — see `sendNonEvmAsset`. */}
          {request.feeLabel ?? t("paid_in_network_resources")}
        </span>
      </div>
    </>
  );
}

/** Presentation names, matching the wallet hub's address cards. */
const VM_LABEL: Record<string, string> = {
  SOLANA: "Solana",
  TON: "The Open Network",
  TRON: "TRON mainnet (TRC-20)",
};

/* ── shared bits ──────────────────────────────────────────────────────────── */

function Header({
  icon,
  title,
  description,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone?: "default" | "warning";
}) {
  return (
    <DialogHeader>
      <div
        className={cn(
          "mb-2 flex size-10 items-center justify-center rounded-full",
          tone === "warning"
            ? "bg-warning/10 text-warning"
            : "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </div>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
    </DialogHeader>
  );
}

function Row({
  label,
  value,
  mono,
  emphasis,
}: {
  label: string;
  value: string;
  mono?: boolean;
  emphasis?: boolean;
}) {
  return (
    /* `min-w-0` for the same reason as the dialog's children: this row is itself
       a grid item, and a 66-character address in the value would otherwise size
       the column to it. `break-all` on the value only helps once the box is
       allowed to be narrower than its content. */
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <span className="shrink-0 text-[11px] text-subtle-foreground">{label}</span>
      <span
        className={cn(
          "text-right text-xs break-all",
          mono && "font-mono text-[11px]",
          emphasis && "font-semibold text-warning"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Warning({
  children,
  tone = "warning",
}: {
  children: React.ReactNode;
  tone?: "warning" | "muted";
}) {
  const Icon = tone === "warning" ? ShieldAlert : AlertTriangle;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded px-3 py-2 text-[11px] leading-relaxed",
        tone === "warning"
          ? "bg-warning/10 text-warning"
          : "bg-surface-2 text-subtle-foreground"
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/** Hex means bytes; decode to text only when the result is printable. */
function decodeMessage(message: string): string {
  if (!/^0x[0-9a-fA-F]*$/.test(message)) return message;
  try {
    const bytes = new Uint8Array(
      (message.slice(2).match(/.{1,2}/g) ?? []).map((b) => Number.parseInt(b, 16))
    );
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // A control character means it was never text. Checked by code point
    // rather than a regex literal: an escape sequence for this range is easy
    // to write as the literal bytes by accident, which is a file that no
    // longer parses as text.
    for (const char of text) {
      const code = char.codePointAt(0) ?? 0;
      const printable = code >= 32 || code === 9 || code === 10 || code === 13;
      if (!printable) return message;
    }
    return text;
  } catch {
    return message;
  }
}

function safeBigInt(value: string | undefined): bigint {
  try {
    return value ? BigInt(value) : BigInt(0);
  } catch {
    return BigInt(0);
  }
}

/** `JSON.stringify` throws on a bigint, and typed-data messages carry them. */
function jsonSafe(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export default ApprovalDialog;
