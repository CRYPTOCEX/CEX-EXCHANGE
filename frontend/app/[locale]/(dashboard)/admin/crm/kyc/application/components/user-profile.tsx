import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Sparkles,
  Clock,
  Activity,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface UserProfileProps {
  user: any;
  userName: string;
  userInitials: string;
  copiedField: string | null;
  onCopy: (text: string, fieldId: string) => void;
}

const UserStatusBadge = ({ status }: { status?: string }) => {
  const tCommon = useTranslations("common");
  if (!status) return null;

  switch (status) {
    case "ACTIVE":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50 flex items-center gap-1"
        >
          <UserCheck className="h-3 w-3" />
          {tCommon("active")}
        </Badge>
      );
    case "INACTIVE":
      return (
        <Badge
          variant="outline"
          className="bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 flex items-center gap-1"
        >
          <UserX className="h-3 w-3" />
          {tCommon("inactive")}
        </Badge>
      );
    case "SUSPENDED":
      return (
        <Badge
          variant="outline"
          className="bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50 flex items-center gap-1"
        >
          <Lock className="h-3 w-3" />
          {tCommon("suspended")}
        </Badge>
      );
    case "BANNED":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50 flex items-center gap-1"
        >
          <XCircle className="h-3 w-3" />
          {tCommon("banned")}
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
        >
          {status}
        </Badge>
      );
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
    <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-blue-950/30 border border-purple-100 dark:border-purple-800/30 rounded-2xl p-6 shadow-sm print-border">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-200/40 to-indigo-200/40 dark:from-purple-800/20 dark:to-indigo-800/20 rounded-full -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-200/40 to-purple-200/40 dark:from-blue-800/20 dark:to-purple-800/20 rounded-full translate-y-1/2 -translate-x-1/4" />

      <div className="relative flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
          <Avatar className="h-32 w-32 relative border-4 border-white dark:border-zinc-800 shadow-xl ring-4 ring-purple-100 dark:ring-purple-900/50">
            <AvatarImage src={user.avatar || undefined} alt={userName} />
            <AvatarFallback className="text-4xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-1.5 shadow-lg border-2 border-white dark:border-zinc-700">
            {getUserStatusBadge(user.status)}
          </div>
          <div className="absolute -top-1 -left-1 bg-white dark:bg-zinc-900 rounded-full p-1.5 shadow-md">
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
        </div>
        <div className="text-center md:text-left flex-1">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <h3 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400">
              {userName}
            </h3>
          </div>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium">{user.email}</p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
            <Badge
              className="bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50 flex items-center gap-1.5 px-3 py-1 shadow-sm"
            >
              <Shield className="h-3.5 w-3.5" />
              {tCommon("role_id")} {user.roleId}
            </Badge>
            <Badge
              className="bg-white dark:bg-zinc-900 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 flex items-center gap-1.5 px-3 py-1 shadow-sm"
            >
              <Calendar className="h-3.5 w-3.5" />
              {tCommon("joined")}{" "}
              {new Date(user.createdAt ?? "").toLocaleDateString()}
            </Badge>
            <Badge
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 shadow-sm border",
                user.emailVerified
                  ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50"
                  : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50"
              )}
            >
              {user.emailVerified ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {user.emailVerified ? "Verified Email" : "Unverified Email"}
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
  const tCommon = useTranslations("common");
  return (
    <Card className="overflow-hidden rounded-xl border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow duration-300 print-border">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-blue-100 dark:border-blue-800/30">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Mail className="h-4 w-4 text-white" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            {tCommon("contact_information")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ul className="space-y-3">
          <li className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-blue-50/40 dark:from-blue-950/20 dark:to-blue-950/10 border border-blue-100 dark:border-blue-800/30 hover:border-blue-200 dark:hover:border-blue-700/50 transition-all duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-2.5 rounded-xl shadow-sm">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  {tCommon("email_address")}
                </p>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 truncate">
                  <span className="truncate">{user.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 no-print opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    onClick={() => onCopy(user.email || "", "email")}
                  >
                    {copiedField === "email" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-blue-500" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <Badge
              className={cn(
                "self-start sm:self-center px-3 py-1",
                user.emailVerified
                  ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50"
                  : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50"
              )}
            >
              {user.emailVerified ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Unverified</>
              )}
            </Badge>
          </li>

          <li className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-50/80 to-green-50/40 dark:from-green-950/20 dark:to-green-950/10 border border-green-100 dark:border-green-800/30 hover:border-green-200 dark:hover:border-green-700/50 transition-all duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-2.5 rounded-xl shadow-sm">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                  {tCommon("phone_number")}
                </p>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  {user.phone || <span className="text-zinc-400 dark:text-zinc-500 font-normal">Not provided</span>}
                  {user.phone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 no-print opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-100 dark:hover:bg-green-900/30"
                      onClick={() => onCopy(user.phone || "", "phone")}
                    >
                      {copiedField === "phone" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </li>

          <li className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50/80 to-amber-50/40 dark:from-amber-950/20 dark:to-amber-950/10 border border-amber-100 dark:border-amber-800/30 hover:border-amber-200 dark:hover:border-amber-700/50 transition-all duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-gradient-to-br from-amber-400 to-orange-600 p-2.5 rounded-xl shadow-sm">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  {tCommon("wallet_address")}
                </p>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  {user.walletAddress ? (
                    <>
                      <span className="font-mono text-sm bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                        {`${user.walletAddress.substring(0, 8)}...${user.walletAddress.substring(user.walletAddress.length - 6)}`}
                      </span>
                      <div className="flex items-center no-print opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                          onClick={() => onCopy(user.walletAddress || "", "wallet")}
                        >
                          {copiedField === "wallet" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-amber-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                        >
                          <ExternalLink className="h-4 w-4 text-amber-500" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500 font-normal">Not provided</span>
                  )}
                </div>
              </div>
            </div>
            {user.walletProvider && (
              <Badge className="self-start sm:self-center bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-3 py-1">
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
    <Card className="overflow-hidden rounded-xl border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow duration-300 print-border">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-b border-purple-100 dark:border-purple-800/30">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-violet-600 dark:from-purple-400 dark:to-violet-400">
            {tCommon("account_security")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-50/80 to-purple-50/40 dark:from-purple-950/20 dark:to-purple-950/10 border border-purple-100 dark:border-purple-800/30 hover:border-purple-200 dark:hover:border-purple-700/50 transition-all duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-gradient-to-br from-purple-400 to-violet-600 p-2.5 rounded-xl shadow-sm">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                  {tCommon("last_login")}
                </p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : <span className="text-zinc-400 dark:text-zinc-500 font-normal">Never</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-red-50/80 to-red-50/40 dark:from-red-950/20 dark:to-red-950/10 border border-red-100 dark:border-red-800/30 hover:border-red-200 dark:hover:border-red-700/50 transition-all duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <div className={cn(
                "p-2.5 rounded-xl shadow-sm",
                (user.failedLoginAttempts || 0) > 3
                  ? "bg-gradient-to-br from-red-500 to-rose-600"
                  : "bg-gradient-to-br from-red-400 to-red-500"
              )}>
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                  {tCommon("failed_login_attempts")}
                </p>
                <p className={cn(
                  "font-semibold",
                  (user.failedLoginAttempts || 0) > 3
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-900 dark:text-zinc-100"
                )}>
                  {user.failedLoginAttempts || 0}
                </p>
              </div>
            </div>
            {(user.failedLoginAttempts || 0) > 3 && (
              <Badge className="self-start sm:self-center bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-3 py-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {tCommon("high_risk")}
              </Badge>
            )}
          </div>

          <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 to-indigo-50/40 dark:from-indigo-950/20 dark:to-indigo-950/10 border border-indigo-100 dark:border-indigo-800/30 hover:border-indigo-200 dark:hover:border-indigo-700/50 transition-all duration-200 print-border">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-gradient-to-br from-indigo-400 to-indigo-600 p-2.5 rounded-xl shadow-sm">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                  {tCommon("wallet_provider")}
                </p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.walletProvider || <span className="text-zinc-400 dark:text-zinc-500 font-normal">None</span>}
                </p>
              </div>
            </div>
            {user.walletProvider && (
              <Badge className="self-start sm:self-center bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 px-3 py-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                {tCommon("connected")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
