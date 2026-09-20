"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

// Mirrors GET /api/user/profile/password. The server is the authority on all of
// this: whether the account even HAS a password, and whether a second factor will
// be demanded, are recomputed there on submit, so this is only used to decide
// which fields to render.
interface PasswordRequirements {
  hasPassword: boolean;
  requiresTwoFactorCode: boolean;
  twoFactorType: "EMAIL" | "SMS" | "APP" | null;
  codeDeliveryRequired: boolean;
  canRequestSetupLink: boolean;
}

const MAX_PASSWORD_LENGTH = 128;

/**
 * What the dialog assumes about the account while GET /password is in flight.
 *
 * The spinner this replaced was not just shapeless, it was a SWAP: the whole
 * dialog body — three fields, the five-rule checklist and the footer — was
 * withheld behind a 68px `py-8` row, so the dialog opened small, sat there, and
 * then grew by roughly 400px into the form the user had come for. That is the
 * single worst shape a modal can have, because the growth happens under a
 * pointer that is already moving toward where the first field is about to be.
 *
 * `hasPassword: true` is not a guess picked for convenience. It is the same
 * shape the error path below already falls back to, and for good reason: an
 * account with NO password is the rare case (Google- or wallet-only sign-in),
 * so assuming one is right almost every time and wrong in exactly the case that
 * already showed a different panel.
 *
 * Everything else is false/null, which is the CONSERVATIVE direction in each
 * case — no second-factor field is claimed, no "send code" button is offered,
 * and `canRequestSetupLink: false` means the setup-link button stays disabled
 * until the server says otherwise. A pending render must not offer an action it
 * has not been told the account may take.
 */
const PENDING_REQUIREMENTS: PasswordRequirements = {
  hasPassword: true,
  requiresTwoFactorCode: false,
  twoFactorType: null,
  codeDeliveryRequired: false,
  canRequestSetupLink: false,
};

// One entry per rule in the server's validatePassword, checked INDEPENDENTLY.
// The older reset form merges "digit or symbol" into a single bucket and so calls
// a password strong that the server then rejects — a checklist of the actual five
// rules is what keeps the two from drifting.
function passwordRules(value: string) {
  return [
    { label: "At least 8 characters", ok: value.length >= 8 },
    { label: "An uppercase letter", ok: /[A-Z]/.test(value) },
    { label: "A lowercase letter", ok: /[a-z]/.test(value) },
    { label: "A number", ok: /\d/.test(value) },
    // `\W` treats the underscore as a word character, so "_" alone does NOT
    // satisfy the server. Naming real symbols avoids the user picking it first.
    { label: "A symbol such as ! @ # $ %", ok: /\W/.test(value) },
  ];
}

// Each field gets its own reveal state — a single shared toggle would expose the
// current password while the user is only checking what they just typed.
function RevealInput({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}) {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const [visible, setVisible] = useState(false);
  const RevealIcon = visible ? EyeOff : Eye;
  return (
    <Input
      label={label}
      type={visible ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      autoComplete={autoComplete}
      // Matches the server's cap, which exists because argon2 hashes are
      // memory-expensive and an unbounded plaintext is a DoS vector.
      maxLength={MAX_PASSWORD_LENGTH}
      postfix={
        <button
          type="button"
          // Out of the tab order: the toggle is a convenience, and tabbing
          // through it between every field slows keyboard entry down.
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? tCommon("hide_password") : tCommon("show_password")}
          className="text-muted-foreground hover:text-foreground"
        >
          <RevealIcon className="h-4 w-4" />
        </button>
      }
    />
  );
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful change so the caller can refresh Active Sessions. */
  onChanged?: () => void;
}) {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<PasswordRequirements | null>(
    null
  );
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  // Never leave a plaintext password sitting in component state once the dialog
  // is done with it.
  const clearFields = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTwoFactorCode("");
  }, []);

  useEffect(() => {
    if (!open) {
      clearFields();
      return;
    }
    let cancelled = false;
    setLoadingRequirements(true);
    void (async () => {
      const { data, error } = await $fetch({
        url: "/api/user/profile/password",
        silent: true,
      });
      if (cancelled) return;
      // An error body carries nothing but a message, so there is no state to read
      // from it — assume the ordinary "has a password" shape and let the submit
      // surface the real problem.
      setRequirements(
        !error && data
          ? (data as PasswordRequirements)
          : {
              hasPassword: true,
              requiresTwoFactorCode: false,
              twoFactorType: null,
              codeDeliveryRequired: false,
              canRequestSetupLink: false,
            }
      );
      setLoadingRequirements(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clearFields]);

  /*
   * ONE source for everything the body reads, so removing the loading swap does
   * not scatter `requirements?.` through the JSX. `pending` covers both the
   * in-flight flag and the null-before-first-response window — they were a
   * single `||` in the old spinner condition and they stay a single name.
   */
  const pending = loadingRequirements || !requirements;
  const req = requirements ?? PENDING_REQUIREMENTS;

  const rules = passwordRules(newPassword);
  const meetsPolicy = rules.every((r) => r.ok);
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const needsCode = req.requiresTwoFactorCode;

  const canSubmit =
    !busy &&
    // Re-gated on the data actually having arrived. `needsCode` is false while
    // pending — it has to be, nothing has said otherwise yet — so without this
    // a fast typist on a slow connection could submit a 2FA-protected account's
    // password change with no code and collect a server rejection for it. The
    // early return used to make that impossible; now the guard does.
    !pending &&
    Boolean(currentPassword) &&
    meetsPolicy &&
    matches &&
    (!needsCode || twoFactorCode.length > 0);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    // $fetch always resolves to { data, error } — there is nothing to catch.
    const { data, error } = await $fetch({
      url: "/api/user/profile/password",
      method: "PUT",
      body: {
        currentPassword,
        newPassword,
        confirmPassword,
        ...(needsCode ? { twoFactorCode } : {}),
      },
      silent: true,
    });
    setBusy(false);

    if (error) {
      // Keep the dialog open and the new password intact, but drop the secrets
      // that were just rejected so a retry cannot resubmit them by accident.
      setCurrentPassword("");
      setTwoFactorCode("");
      toast({
        title: t("password_not_changed"),
        description: error,
        variant: "destructive",
      });
      return;
    }

    const revoked = Number(data?.revokedSessions) || 0;
    clearFields();
    onOpenChange(false);
    toast({
      title: t("password_changed"),
      // Prefer the server's wording: it also covers the case where the password
      // was written but the other devices could not be evicted.
      description:
        data?.message ||
        (revoked > 0
          ? t("other_device_s_were_signed_out", { revoked: String(revoked) })
          : t("your_new_password_is_active_on_this_device")),
    });
    onChanged?.();
  };

  const sendCode = async () => {
    setSendingCode(true);
    const { data, error } = await $fetch({
      url: "/api/user/profile/password/code",
      method: "POST",
      silent: true,
    });
    setSendingCode(false);
    if (error) {
      toast({
        title: t("could_not_send_a_code"),
        description: error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: t("code_sent"),
      description: data?.message || t("check_for_your_verification_code"),
    });
  };

  const requestSetupLink = async () => {
    setSendingLink(true);
    const { data, error } = await $fetch({
      url: "/api/user/profile/password/setup-link",
      method: "POST",
      silent: true,
    });
    setSendingLink(false);
    if (error) {
      toast({
        title: t("could_not_send_the_link"),
        description: error,
        variant: "destructive",
      });
      return;
    }
    onOpenChange(false);
    toast({
      title: tCommon("check_your_email"),
      description:
        data?.message || t("weve_emailed_you_a_link_to_set_your_password"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* The header was ALREADY written this way — `requirements && …` falls
            through to the "Change password" wording while the request is in
            flight — so the title and description never moved. The body below is
            now held to the same standard. */}
        <DialogHeader>
          <DialogTitle>
            {!req.hasPassword ? t("set_a_password") : tCommon("change_password")}
          </DialogTitle>
          <DialogDescription>
            {!req.hasPassword
              ? t("this_account_signs_in_with_google")
              : t("confirm_your_current_password_then_choose")}
          </DialogDescription>
        </DialogHeader>

        {!req.hasPassword ? (
          // No existing credential to re-prove ownership against, so the password
          // cannot be set from this session alone — the link to the account's
          // inbox is what proves the person asking is the owner.
          <div className="space-y-4">
            <p className="text-sm text-subtle-foreground">
              {t("to_keep_the_account_safe_a")}
            </p>
            <div className="flex items-start gap-2 rounded-xl bg-warning/5 border border-warning/10 p-3">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
              <span className="text-xs text-warning-ink">
                {t("following_that_link_signs_you_out")}
              </span>
            </div>
            {/* Unreachable while pending — PENDING_REQUIREMENTS claims a
                password, so this whole panel only renders once the server has
                answered. Reading `req` rather than `requirements` anyway, so
                the branch does not depend on which of the two a future edit
                happens to reach for. */}
            {!req.canRequestSetupLink && (
              <p className="text-sm text-destructive">
                {t("verify_your_email_address_first_the")}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={sendingLink}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void requestSetupLink()}
                loading={sendingLink}
                disabled={sendingLink || !req.canRequestSetupLink}
              >
                {t("email_me_a_link")}
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            /* The whole form renders while GET /password is in flight and the
               fields stay TYPEABLE. That is deliberate: the first field carries
               `autoFocus`, so disabling it during the request would swallow the
               keystrokes of anyone who starts typing straight away — the exact
               people a fast dialog is for. Nothing here needs the response to
               be laid out; only `canSubmit` needs it to be correct, and it is
               gated on `!pending` above. */
            aria-busy={pending || undefined}
            className="space-y-4"
          >
            <RevealInput
              label={tCommon("current_password")}
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder={tCommon("current_password")}
              autoComplete="current-password"
              autoFocus
              disabled={busy}
            />

            <div>
              <RevealInput
                label={tCommon("new_password")}
                value={newPassword}
                onChange={setNewPassword}
                placeholder={tCommon("new_password")}
                autoComplete="new-password"
                disabled={busy}
              />
              <ul className="space-y-1 pt-2">
                {rules.map((rule) => (
                  <li
                    key={rule.label}
                    className="flex items-center gap-2 text-xs"
                  >
                    {rule.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        rule.ok ? "text-success" : "text-subtle-foreground"
                      )}
                    >
                      {rule.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <RevealInput
                label={t("confirm_new_password")}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={t("repeat_new_password")}
                autoComplete="new-password"
                disabled={busy}
              />
              {confirmPassword.length > 0 && !matches && (
                <p className="pt-1 text-xs text-destructive">
                  {t("the_new_passwords_do_not_match")}
                </p>
              )}
            </div>

            {/* The ONE block that genuinely cannot be reserved. Whether a second
                factor is demanded is not knowable before the response, and
                there is no honest placeholder for "maybe a field": rendering it
                would promise a code box to accounts that have no 2FA, and
                disabling it would be worse. So this block does appear late for
                2FA accounts — but it appears ABOVE the footer inside a
                centre-anchored dialog, which grows symmetrically, rather than
                the ~400px asymmetric jump the removed spinner produced for
                everyone. */}
            {needsCode && (
              <div>
                <div className="flex items-end gap-2">
                  <Input
                    label={t("two_factor_code")}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    disabled={busy}
                  />
                  {req.codeDeliveryRequired && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void sendCode()}
                      loading={sendingCode}
                      disabled={busy || sendingCode}
                    >
                      {t("send_code")}
                    </Button>
                  )}
                </div>
                {/* Recovery codes are accepted on purpose, so someone who lost
                    their authenticator can still rotate their password. */}
                <p className="pt-1 text-xs text-subtle-foreground">
                  {req.twoFactorType === "APP"
                    ? t("enter_the_current_code_from_your")
                    : t("enter_the_code_we_sent_you")}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" loading={busy} disabled={!canSubmit}>
                {tCommon("change_password")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ChangePasswordDialog;
