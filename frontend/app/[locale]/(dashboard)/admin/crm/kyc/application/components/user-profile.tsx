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
} from "lucide-react";
import { useTranslations } from "next-intl";

interface UserProfileProps {
  user: any;
  userName: string;
  userInitials: string;
  copiedField: string | null;
  onCopy: (text: string, fieldId: string) => void;
}

export const getUserStatusBadge = (status?: string) => {
  const t = useTranslations("dashboard");
  if (!status) return null;

  switch (status) {
    case "ACTIVE":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50 flex items-center gap-1"
        >
          <UserCheck className="h-3 w-3" />
          {t("Active")}
        </Badge>
      );
    case "INACTIVE":
      return (
        <Badge
          variant="outline"
          className="bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 flex items-center gap-1"
        >
          <UserX className="h-3 w-3" />
          {t("Inactive")}
        </Badge>
      );
    case "SUSPENDED":
      return (
        <Badge
          variant="outline"
          className="bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50 flex items-center gap-1"
        >
          <Lock className="h-3 w-3" />
          {t("Suspended")}
        </Badge>
      );
    case "BANNED":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50 flex items-center gap-1"
        >
          <XCircle className="h-3 w-3" />
          {t("Banned")}
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

export const UserProfileHeader = ({
  user,
  userName,
  userInitials,
}: Omit<UserProfileProps, "copiedField" | "onCopy">) => {
  const t = useTranslations("dashboard");
  return (
    <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-blue-950/20 border border-purple-100 dark:border-purple-800/50 rounded-xl p-6 shadow-sm print-border">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-indigo-200 dark:from-purple-800/50 dark:to-indigo-800/50 rounded-full blur-md opacity-50"></div>
          <Avatar className="h-28 w-28 relative border-4 border-white shadow-lg">
            <AvatarImage src={user.avatar || undefined} alt={userName} />
            <AvatarFallback className="text-3xl bg-gradient-to-r from-purple-400 to-indigo-500 text-white">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md">
            {getUserStatusBadge(user.status)}
          </div>
        </div>
        <div className="text-center md:text-left flex-1">
          <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400">
            {userName}
          </h3>
          <p className="text-indigo-600 dark:text-indigo-400">{user.email}</p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
            <Badge
              variant="outline"
              className="bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50 flex items-center gap-1"
            >
              <Shield className="h-3 w-3" />
              {t("role_id")}
              {user.roleId}
            </Badge>
            <Badge
              variant="outline"
              className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50 flex items-center gap-1"
            >
              <Calendar className="h-3 w-3" />
              {t("joined")}{" "}
              {new Date(user.createdAt ?? "").toLocaleDateString()}
            </Badge>
            <Badge
              variant="outline"
              className={`${user.emailVerified ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50" : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50"} flex items-center gap-1`}
            >
              <Mail className="h-3 w-3" />{" "}
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
  const t = useTranslations("dashboard");
  return (
    <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow transition-shadow duration-200 print-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-500" />
          {t("contact_information")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          <li className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-md bg-blue-50/50 dark:bg-blue-950/10 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors print-border">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {t("email_address")}
                </p>
                <div className="font-medium flex items-center gap-2">
                  {user.email}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 no-print"
                    onClick={() => onCopy(user.email || "", "email")}
                  >
                    {copiedField === "email" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <Badge
              variant={user.emailVerified ? "default" : "destructive"}
              className="mt-2 sm:mt-0 sm:ml-auto self-start sm:self-center"
            >
              {user.emailVerified ? "Verified" : "Unverified"}
            </Badge>
          </li>
          <li className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-md bg-green-50/50 dark:bg-green-950/10 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors print-border">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-full">
                <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {t("phone_number")}
                </p>
                <div className="font-medium flex items-center gap-2">
                  {user.phone || "Not provided"}
                  {user.phone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 no-print"
                      onClick={() => onCopy(user.phone || "", "phone")}
                    >
                      {copiedField === "phone" ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </li>
          <li className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-md bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors print-border">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full">
                <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {t("wallet_address")}
                </p>
                <div className="font-medium flex items-center gap-2">
                  {user.walletAddress ? (
                    <>
                      <span className="font-mono text-sm">
                        {`${user.walletAddress.substring(0, 8)}...${user.walletAddress.substring(user.walletAddress.length - 6)}`}
                      </span>
                      <div className="flex items-center no-print">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            onCopy(user.walletAddress || "", "wallet")
                          }
                        >
                          {copiedField === "wallet" ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    "Not provided"
                  )}
                </div>
              </div>
            </div>
            {user.walletProvider && (
              <Badge
                variant="outline"
                className="mt-2 sm:mt-0 sm:ml-auto self-start sm:self-center bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
              >
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
  const t = useTranslations("dashboard");
  return (
    <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow transition-shadow duration-200 print-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-500" />
          {t("account_security")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-md bg-purple-50/50 dark:bg-purple-950/10 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors print-border">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("last_login")}
                </p>
                <p className="font-medium">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors print-border">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("failed_login_attempts")}
                </p>
                <p className="font-medium">{user.failedLoginAttempts || 0}</p>
              </div>
            </div>
            {(user.failedLoginAttempts || 0) > 3 && (
              <Badge
                variant="outline"
                className="mt-2 sm:mt-0 self-start sm:self-center bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50"
              >
                {t("high_risk")}
              </Badge>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md bg-indigo-50/50 dark:bg-indigo-950/10 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors print-border">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-full">
                <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("wallet_provider")}
                </p>
                <p className="font-medium">{user.walletProvider || "None"}</p>
              </div>
            </div>
            {user.walletProvider && (
              <Badge
                variant="outline"
                className="mt-2 sm:mt-0 self-start sm:self-center bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50"
              >
                {t("Connected")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
