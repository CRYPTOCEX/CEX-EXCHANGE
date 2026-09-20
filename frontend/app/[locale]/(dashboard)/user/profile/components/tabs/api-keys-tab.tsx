"use client";

import { useState, useEffect } from "react";
import {
  Key,
  Plus,
  MoreHorizontal,
  Settings,
  Trash2,
  Copy,
  AlertTriangle,
  Shield,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useKycGate } from "@/hooks/use-kyc-gate";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
export function ApiKeysTab() {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const gate = useKycGate("api_keys");
  const { toast } = useToast();
  const apiKeys = useUserStore((state) => state.apiKeys);
  const createApiKey = useUserStore((state) => state.createApiKey);
  const updateApiKey = useUserStore((state) => state.updateApiKey);
  const deleteApiKey = useUserStore((state) => state.deleteApiKey);
  const apiKeyLoading = useUserStore((state) => state.apiKeyLoading);
  const apiPermissions = useUserStore((state) => state.apiPermissions);
  const fetchApiKeys = useUserStore((state) => state.fetchApiKeys);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [newApiKeyPermissions, setNewApiKeyPermissions] = useState<string[]>(
    []
  );
  const [newApiKeyIpRestrictions, setNewApiKeyIpRestrictions] = useState("");
  const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [ipError, setIpError] = useState("");
  const [enableIpRestrictions, setEnableIpRestrictions] = useState(false);

  // Edit API Key state
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<apiKeyAttributes | null>(
    null
  );
  const [editKeyPermissions, setEditKeyPermissions] = useState<string[]>([]);
  const [editKeyIpRestrictions, setEditKeyIpRestrictions] = useState("");
  const [editEnableIpRestrictions, setEditEnableIpRestrictions] =
    useState(false);
  const [editIpError, setEditIpError] = useState("");

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletingApiKey, setDeletingApiKey] = useState<apiKeyAttributes | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    fetchApiKeys();
  }, []);
  if (gate.state === "loading" || gate.state === "anonymous") {
    return null;
  }
  if (!gate.allowed) {
    // This shows the correct message/title/description
    return (
      <KycRequiredNotice
        feature="api_keys"
        requirement={gate.requirement ?? "verification"}
      />
    );
  }

  // Validate IP addresses (IPv4 and IPv6)
  const validateIpAddresses = (ipString: string): boolean => {
    if (!ipString.trim()) return true; // Empty is valid (optional field)

    const ips = ipString
      .split(",")
      .map((ip) => ip.trim())
      .filter((ip) => ip);

    // Regular expressions for IPv4 and IPv6
    const ipv4Regex =
      /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
    const ipv6Regex =
      /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}:[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,2}[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,3}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,3}[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:){0,2}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4}::(?:[0-9a-fA-F]{1,4}:)?[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}::[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}::$/;
    for (const ip of ips) {
      if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
        return false;
      }
    }
    return true;
  };
  const handleCreateApiKey = async () => {
    if (!newApiKeyName || newApiKeyPermissions.length === 0) {
      toast({
        title: tCommon("validation_error"),
        description:
          t("please_provide_a_name_and_select"),
        variant: "destructive",
      });
      return;
    }

    // Validate IP addresses if restrictions are enabled
    if (enableIpRestrictions) {
      if (!newApiKeyIpRestrictions.trim()) {
        setIpError(
          "Please enter at least one IP address or disable IP restrictions."
        );
        return;
      }
      if (!validateIpAddresses(newApiKeyIpRestrictions)) {
        setIpError(
          "Invalid IP address format. Please enter valid IPv4 or IPv6 addresses."
        );
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const apiKey = await createApiKey(
        newApiKeyName,
        newApiKeyPermissions,
        enableIpRestrictions
          ? newApiKeyIpRestrictions
              .split(",")
              .map((ip) => ip.trim())
              .filter((ip) => ip)
          : [],
        enableIpRestrictions
      );
      if (apiKey) {
        setNewApiKey(apiKey.key);
        setShowNewApiKey(true);

        // Reset form
        setNewApiKeyName("");
        setNewApiKeyPermissions([]);
        setNewApiKeyIpRestrictions("");
        setEnableIpRestrictions(false);
        setIpError("");
        setIsCreatingApiKey(false);
        toast({
          title: t("api_key_created"),
          description: t("your_new_api_key_has_been_created_successfully"),
        });
      } else {
        toast({
          title: tCommon("creation_failed"),
          description: t("failed_to_create_api_key_please_try_again"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      toast({
        title: tCommon("creation_failed"),
        description: t("failed_to_create_api_key_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const confirmDeleteApiKey = (apiKey: apiKeyAttributes) => {
    setDeletingApiKey(apiKey);
    setShowDeleteConfirmation(true);
  };
  const handleDeleteApiKey = async () => {
    if (!deletingApiKey) return;
    setIsDeleting(true);
    try {
      await deleteApiKey(deletingApiKey.id);
      setShowDeleteConfirmation(false);
      setDeletingApiKey(null);
      toast({
        title: tCommon("api_key_deleted"),
        description: t("the_api_key_has_been_deleted_successfully"),
      });
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        title: t("deletion_failed"),
        description: t("failed_to_delete_api_key_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const handleEditApiKey = (apiKey: apiKeyAttributes) => {
    setEditingApiKey(apiKey);
    setEditKeyPermissions([...apiKey.permissions]);
    setEditEnableIpRestrictions(apiKey.ipRestriction || false);
    const ipWhitelist = apiKey.ipWhitelist || [];
    const ipString = Array.isArray(ipWhitelist) ? ipWhitelist.join(", ") : ipWhitelist;
    setEditKeyIpRestrictions(ipString);
    setIsEditingApiKey(true);
  };
  const handleSaveApiKeyEdit = async () => {
    if (editKeyPermissions.length === 0) {
      toast({
        title: tCommon("validation_error"),
        description: t("please_select_at_least_one_permission"),
        variant: "destructive",
      });
      return;
    }

    // Validate IP addresses if restrictions are enabled
    if (editEnableIpRestrictions) {
      if (!editKeyIpRestrictions.trim()) {
        setEditIpError(
          "Please enter at least one IP address or disable IP restrictions."
        );
        return;
      }
      if (!validateIpAddresses(editKeyIpRestrictions)) {
        setEditIpError(
          "Invalid IP address format. Please enter valid IPv4 or IPv6 addresses."
        );
        return;
      }
    }
    try {
      if (editingApiKey) {
        await updateApiKey(
          editingApiKey.id,
          editKeyPermissions,
          editEnableIpRestrictions
            ? editKeyIpRestrictions
                .split(",")
                .map((ip) => ip.trim())
                .filter((ip) => ip)
            : [],
          editEnableIpRestrictions
        );
        setIsEditingApiKey(false);
        toast({
          title: t("api_key_updated"),
          description: t("your_api_key_has_been_updated_successfully"),
        });
      }
    } catch (error) {
      console.error("Error updating API key:", error);
      toast({
        title: t("update_failed"),
        description: t("failed_to_update_api_key_please_try_again"),
        variant: "destructive",
      });
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{tCommon("api_keys")}</h2>
        {apiKeys.length < 10 && (
          <Button onClick={() => setIsCreatingApiKey(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {tCommon("create_api_key")}
          </Button>
        )}
      </div>

      <Card className="bg-card border-0 border-border ">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">{tCommon("your_api_keys")}</CardTitle>
            <Link
              href="/api-docs"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <BookOpen className="h-4 w-4" />
              {tCommon("api_documentation")}
            </Link>
          </div>
          <CardDescription className="text-muted-foreground">
            {t("manage_api_keys_your_account")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {apiKeyLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">
                {t("loading_api_keys")}…
              </p>
            </div>
          ) : apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => {
                return (
                  <div
                    key={apiKey.id}
                    className="border border-border-strong rounded-lg p-4 space-y-3 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Key className="h-4 w-4 text-primary" />
                        </div>
                        <div className="font-medium text-foreground">
                          {apiKey.name}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditApiKey(apiKey)}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            {tCommon("edit_api_key")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => confirmDeleteApiKey(apiKey)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {tCommon("delete_key")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="bg-muted p-2 rounded font-mono text-sm text-muted-foreground">
                      {apiKey.key.substring(0, 10)}****
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {tCommon("created")}:{" "}
                        </span>
                        {apiKey.createdAt
                          ? formatDate(apiKey.createdAt)
                          : "N/A"}
                      </div>

                      <div>
                        <span className="text-muted-foreground">
                          {tCommon("permissions")}:{" "}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {apiKey.permissions?.map((permission: string) => (
                            <Badge
                              key={permission}
                              variant="outline"
                              className="bg-primary/10 text-primary-ink border-primary/30"
                            >
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground">
                          {t("ip_restrictions")}:{" "}
                        </span>
                        {apiKey.ipRestriction &&
                        apiKey.ipWhitelist && 
                        (Array.isArray(apiKey.ipWhitelist) ? apiKey.ipWhitelist.length > 0 : apiKey.ipWhitelist.length > 0) ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(Array.isArray(apiKey.ipWhitelist) ? apiKey.ipWhitelist : apiKey.ipWhitelist.split(',')).map((ip: string) => (
                              <Badge
                                key={ip}
                                variant="outline"
                                className="bg-muted text-muted-foreground border-border-strong"
                              >
                                {ip}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm">{t("no_restrictions")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="bg-muted p-3 rounded-full inline-flex mb-4">
                <Key className="h-6 w-6 text-subtle-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">
                {t("no_api_keys")}
              </h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {t("you_havent_created_any_api_keys_yet")}
              </p>
              <Button onClick={() => setIsCreatingApiKey(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {tCommon("create_api_key")}
              </Button>
            </div>
          )}

          {isCreatingApiKey && (
            <div className="border border-border-strong rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-foreground">
                {tCommon("create_new_api_key")}
              </h3>

              <div className="space-y-2">
                <Label htmlFor="apiKeyName" className="text-foreground">
                  {t("api_key_name")}
                </Label>
                <Input
                  id="apiKeyName"
                  placeholder={t("e_g_trading_bot")}
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Permissions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {apiPermissions.map((permission) => (
                    <div
                      key={permission.value}
                      className="flex items-start space-x-2"
                    >
                      <Checkbox
                        id={`permission-${permission.value}`}
                        checked={newApiKeyPermissions.includes(
                          permission.value
                        )}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewApiKeyPermissions([
                              ...newApiKeyPermissions,
                              permission.value,
                            ]);
                          } else {
                            setNewApiKeyPermissions(
                              newApiKeyPermissions.filter(
                                (p) => p !== permission.value
                              )
                            );
                          }
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`permission-${permission.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                        >
                          {permission.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="enableIpRestrictions"
                      className="text-foreground"
                    >
                      {t("ip_restrictions")}:
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("limit_api_key_usage_to_specific_ip_addresses")}
                    </p>
                  </div>
                  <Switch
                    id="enableIpRestrictions"
                    checked={enableIpRestrictions}
                    onCheckedChange={setEnableIpRestrictions}
                  />
                </div>

                {enableIpRestrictions && (
                  <div className="space-y-2">
                    <Input
                      placeholder="e.g., 192.168.1.1, 10.0.0.1"
                      value={newApiKeyIpRestrictions}
                      onChange={(e) => {
                        setNewApiKeyIpRestrictions(e.target.value);
                        if (ipError) setIpError("");
                      }}
                      className={ipError ? "border-destructive" : ""}
                    />
                    {ipError ? (
                      <p className="text-xs text-destructive">{ipError}</p>
                    ) : (
                      <div className="flex items-start gap-2 p-2 bg-primary/10 rounded-md">
                        <Shield className="h-4 w-4 text-primary text-primary mt-0.5" />
                        <div className="text-xs text-primary">
                          <p className="font-medium">
                            {t("recommended_security_practice")}
                          </p>
                          <p>
                            {t("restricting_api_keys_to_specific_ip")} {t("use_your_current_ip_address_or")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingApiKey(false);
                    setNewApiKeyName("");
                    setNewApiKeyPermissions([]);
                    setNewApiKeyIpRestrictions("");
                    setEnableIpRestrictions(false);
                    setIpError("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateApiKey} loading={isSubmitting}>
                  {isSubmitting ? `${tCommon("creating")}…` : tCommon("create_api_key")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Key Security Notice */}
      <Alert className="bg-warning/10 border-warning/30">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">
          {t("api_key_security")}
        </AlertTitle>
        <AlertDescription className="text-warning">
          {t("keep_your_api_keys_secure_1")} {t("they_provide_programmatic_access_to_your_account_1")} {t("never_share_your_api_keys_or")}
        </AlertDescription>
      </Alert>

      {/* New API Key Dialog */}
      <Dialog open={showNewApiKey} onOpenChange={setShowNewApiKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("api_key_created")}</DialogTitle>
            <DialogDescription>
              {t("your_new_api_key_has_been_created_1")} {t("please_copy_it_now_as_you")}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-3 rounded-md font-mono text-sm break-all text-muted-foreground">
            {newApiKey}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(newApiKey);
                toast({
                  title: tCommon("copied"),
                  description: t("api_key_copied_to_clipboard"),
                });
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              {tDashboard("copy_to_clipboard")}
            </Button>
            <Button onClick={() => setShowNewApiKey(false)}>
              {t("ive_saved_my_api_key")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit API Key Dialog */}
      <Dialog
        open={isEditingApiKey}
        onOpenChange={(open) => {
          setIsEditingApiKey(open);
          if (!open) {
            setEditIpError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("edit_api_key")}</DialogTitle>
            <DialogDescription>
              {t("update_permissions_and_ip_restrictions_for")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-foreground">
                {t("api_key_name")}
              </Label>
              <p className="font-medium mt-1 text-foreground">
                {editingApiKey?.name}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Permissions</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {apiPermissions.map((permission) => (
                  <div
                    key={permission.value}
                    className="flex items-start space-x-2"
                  >
                    <Checkbox
                      id={`edit-permission-${permission.value}`}
                      checked={editKeyPermissions.includes(permission.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setEditKeyPermissions([
                            ...editKeyPermissions,
                            permission.value,
                          ]);
                        } else {
                          setEditKeyPermissions(
                            editKeyPermissions.filter(
                              (p) => p !== permission.value
                            )
                          );
                        }
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`edit-permission-${permission.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                      >
                        {permission.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="editEnableIpRestrictions"
                    className="text-foreground"
                  >
                    {t("ip_restrictions")}:
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("limit_api_key_usage_to_specific_ip_addresses")}
                  </p>
                </div>
                <Switch
                  id="editEnableIpRestrictions"
                  checked={editEnableIpRestrictions}
                  onCheckedChange={setEditEnableIpRestrictions}
                />
              </div>

              {editEnableIpRestrictions && (
                <div className="space-y-2">
                  <Input
                    placeholder="e.g., 192.168.1.1, 10.0.0.1"
                    value={editKeyIpRestrictions}
                    onChange={(e) => {
                      setEditKeyIpRestrictions(e.target.value);
                      if (editIpError) setEditIpError("");
                    }}
                    className={editIpError ? "border-destructive" : ""}
                  />
                  {editIpError ? (
                    <p className="text-xs text-destructive">{editIpError}</p>
                  ) : (
                    <div className="flex items-start gap-2 p-2 bg-primary/10 rounded-md">
                      <Shield className="h-4 w-4 text-primary text-primary mt-0.5" />
                      <div className="text-xs text-primary">
                        <p className="font-medium">
                          {t("recommended_security_practice")}
                        </p>
                        <p>
                          {t("restricting_api_keys_to_specific_ip")} {t("use_your_current_ip_address_or")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingApiKey(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveApiKeyEdit}>{tCommon("save_changes")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("delete_api_key")}
            </DialogTitle>
            <DialogDescription>
              {t("are_you_sure_you_want_to_delete_this_api_key")} {tCommon("this_action_cannot_be_undone")}
            </DialogDescription>
          </DialogHeader>

          {deletingApiKey && (
            <div className="border border-border-strong rounded-lg p-3 bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-subtle-foreground" />
                <span className="font-medium text-foreground">
                  {deletingApiKey.name}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>
                  {tCommon("created")}:{" "}
                  {deletingApiKey.createdAt
                    ? formatDate(deletingApiKey.createdAt)
                    : "N/A"}
                </div>
                <div className="mt-1">
                  {tCommon("permissions")}: {deletingApiKey.permissions.join(", ")}
                </div>
              </div>
            </div>
          )}

          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              {t("deleting_this_api_key_will_immediately")} {t("make_sure_you_have_updated_any")}
            </AlertDescription>
          </Alert>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirmation(false);
                setDeletingApiKey(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteApiKey}
              loading={isDeleting}
            >
              {isDeleting ? `${tCommon("deleting")}…` : t("delete_api_key")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
