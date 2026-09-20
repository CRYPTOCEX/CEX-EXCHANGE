import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Copy,
  ExternalLink,
  Lock,
  Mail,
  Phone,
  Shield,
  UserCheck,
  UserX,
  Wallet,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

interface UserProfileProps {
  user: any;
  userName: string;
  userInitials: string;
  copiedField: string | null;
  onCopy: (text: string, fieldId: string) => void;
}

// Account-state pill. The hue is the platform's (`statusTone`); only the icon
// and the translated label are decided here.
const UserStatusBadge = ({ status }: { status?: string }) => {
  const tCommon = useTranslations("common");
  if (!status) return null;

  switch (status) {
    case "ACTIVE":
      return (
        <StatusBadge
          status={status}
          icon={<UserCheck className="h-3 w-3" />}
          label={tCommon("active")}
        />
      );
    case "INACTIVE":
      return (
        <StatusBadge
          status={status}
          icon={<UserX className="h-3 w-3" />}
          label={tCommon("inactive")}
        />
      );
    case "SUSPENDED":
      return (
        <StatusBadge
          status={status}
          icon={<Lock className="h-3 w-3" />}
          label={tCommon("suspended")}
        />
      );
    case "BANNED":
      return (
        <StatusBadge
          status={status}
          icon={<XCircle className="h-3 w-3" />}
          label={tCommon("banned")}
        />
      );
    default:
      // Raw enum, as before — no local humanising.
      return <StatusBadge status={status} label={status} />;
  }
};

export const getUserStatusBadge = (status?: string) => <UserStatusBadge status={status} />;

export const UserProfileHeader = ({
  user,
  userName,
  userInitials,
}: Omit<UserProfileProps, "copiedField" | "onCopy">) => {
  const tCommon = useTranslations("common");
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6 print-border">
      <div className="relative flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <Avatar className="h-32 w-32 relative border border-border">
            <AvatarImage src={user.avatar || undefined} alt={userName} />
            <AvatarFallback className="text-4xl bg-primary text-primary-foreground font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-card rounded-sm p-1.5 border border-border">
            {getUserStatusBadge(user.status)}
          </div>
        </div>
        <div className="text-center md:text-left flex-1">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <h3 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
              {userName}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
            <Badge
              className="bg-card text-primary-ink border border-primary/30 flex items-center gap-1.5 px-3 py-1 "
            >
              <Shield className="h-3.5 w-3.5" />
              {tCommon("role_id")}: {user.roleId}
            </Badge>
            <Badge
              className="bg-card text-primary-ink border border-primary/30 flex items-center gap-1.5 px-3 py-1 "
            >
              <Calendar className="h-3.5 w-3.5" />
              {tCommon("joined")}{" "}
              {new Date(user.createdAt ?? "").toLocaleDateString()}
            </Badge>
            <Badge
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 shadow-sm border",
                user.emailVerified
                  ? "bg-success/10 text-foreground border-success/30"
                  : "bg-destructive/10 text-foreground border-destructive/30"
              )}
            >
              {user.emailVerified ? (
                <CheckCircle className="h-3.5 w-3.5 text-success-ink" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-destructive-ink" />
              )}
              {user.emailVerified ? tCommon("verified_email") : tCommon("unverified_email")}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContactInformation = ({
  user,
  copiedField,
  onCopy,
}: Pick<UserProfileProps, "user" | "copiedField" | "onCopy">) => {
  const t = useTranslations("common");
  const tCommon = useTranslations("common");
  return (
    <Card className="overflow-hidden print-border">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
            <Mail className="h-3.5 w-3.5" />
          </span>
          <span className="text-foreground">
            {tCommon("contact_information")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="space-y-3">
          <li className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-md bg-surface-2 border border-border hover:border-border-strong transition-colors duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {tCommon("email_address")}
                </p>
                <div className="font-semibold text-foreground flex items-center gap-2 truncate">
                  <span className="truncate">{user.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 no-print opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20"
                    onClick={() => onCopy(user.email || "", "email")}
                  >
                    {copiedField === "email" ? (
                      <CheckCircle className="h-4 w-4 text-success-ink" />
                    ) : (
                      <Copy className="h-4 w-4 text-primary-ink" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <Badge
              className={cn(
                "self-start sm:self-center px-3 py-1",
                user.emailVerified
                  ? "bg-success/10 text-foreground border border-success/30"
                  : "bg-destructive/10 text-foreground border border-destructive/30"
              )}
            >
              {user.emailVerified ? (
                <><CheckCircle className="h-3 w-3 mr-1 text-success-ink" /> Verified</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1 text-destructive-ink" /> Unverified</>
              )}
            </Badge>
          </li>

          <li className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-md bg-surface-2 border border-border hover:border-border-strong transition-colors duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {tCommon("phone_number")}
                </p>
                <div className="font-semibold text-foreground flex items-center gap-2">
                  {user.phone ? <span className="font-mono tabular-nums">{user.phone}</span> : <span className="text-subtle-foreground font-normal">{t("not_provided")}</span>}
                  {user.phone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 no-print opacity-0 group-hover:opacity-100 transition-opacity hover:bg-success/20"
                      onClick={() => onCopy(user.phone || "", "phone")}
                    >
                      {copiedField === "phone" ? (
                        <CheckCircle className="h-4 w-4 text-success-ink" />
                      ) : (
                        <Copy className="h-4 w-4 text-success-ink" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </li>

          <li className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-md bg-surface-2 border border-border hover:border-border-strong transition-colors duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {tCommon("wallet_address")}
                </p>
                <div className="font-semibold text-foreground flex items-center gap-2">
                  {user.walletAddress ? (
                    <>
                      <span className="font-mono tabular-nums text-sm bg-surface-3 px-2 py-0.5 rounded-sm">
                        {`${user.walletAddress.substring(0, 8)}...${user.walletAddress.substring(user.walletAddress.length - 6)}`}
                      </span>
                      <div className="flex items-center no-print opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-warning/20"
                          onClick={() => onCopy(user.walletAddress || "", "wallet")}
                        >
                          {copiedField === "wallet" ? (
                            <CheckCircle className="h-4 w-4 text-success-ink" />
                          ) : (
                            <Copy className="h-4 w-4 text-warning-ink" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-warning/20"
                        >
                          <ExternalLink className="h-4 w-4 text-warning-ink" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <span className="text-subtle-foreground font-normal">{t("not_provided")}</span>
                  )}
                </div>
              </div>
            </div>
            {user.walletProvider && (
              <Badge className="self-start sm:self-center bg-warning/15 text-warning-ink border border-warning/30 px-3 py-1">
                {user.walletProvider}
              </Badge>
            )}
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};

export const AccountSecurity = ({ user }: Pick<UserProfileProps, "user">) => {
  const tCommon = useTranslations("common");
  return (
    <Card className="overflow-hidden print-border">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
            <Shield className="h-3.5 w-3.5" />
          </span>
          <span className="text-foreground">
            {tCommon("account_security")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-md bg-surface-2 border border-border hover:border-border-strong transition-colors duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {tCommon("last_login")}
                </p>
                <p className="font-semibold text-foreground">
                  {user.lastLogin
                    ? <span className="font-mono tabular-nums">{new Date(user.lastLogin).toLocaleString()}</span>
                    : <span className="text-subtle-foreground font-normal">Never</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-md bg-surface-2 border border-border hover:border-border-strong transition-colors duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <span className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-sm",
                (user.failedLoginAttempts || 0) > 3
                  ? "bg-destructive/15 text-destructive-ink"
                  : "bg-surface-3 text-muted-foreground"
              )}>
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {tCommon("failed_login_attempts")}
                </p>
                <p className={cn(
                  "font-semibold font-mono tabular-nums",
                  (user.failedLoginAttempts || 0) > 3
                    ? "text-destructive-ink"
                    : "text-foreground"
                )}>
                  {user.failedLoginAttempts || 0}
                </p>
              </div>
            </div>
            {(user.failedLoginAttempts || 0) > 3 && (
              <Badge className="self-start sm:self-center bg-destructive/10 text-foreground border border-destructive/30 px-3 py-1">
                <AlertTriangle className="h-3 w-3 mr-1 text-destructive-ink" />
                {tCommon("high_risk")}
              </Badge>
            )}
          </div>

          <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-md bg-surface-2 border border-border hover:border-border-strong transition-colors duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {tCommon("wallet_provider")}
                </p>
                <p className="font-semibold text-foreground">
                  {user.walletProvider || <span className="text-subtle-foreground font-normal">None</span>}
                </p>
              </div>
            </div>
            {user.walletProvider && (
              <Badge className="self-start sm:self-center bg-success/10 text-foreground border border-success/30 px-3 py-1">
                <CheckCircle className="h-3 w-3 mr-1 text-success-ink" />
                {tCommon("connected")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
