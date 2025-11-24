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
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
export function ApiKeysTab() {
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
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
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("api_keys");
  if (kycEnabled && !hasAccess) {
    // This shows the correct message/title/description
    return <KycRequiredNotice feature="api_keys" />;
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
        title: "Validation Error",
        description:
          "Please provide a name and select at least one permission.",
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
          title: "API Key Created",
          description: "Your new API key has been created successfully.",
        });
      } else {
        toast({
          title: "Creation Failed",
          description: "Failed to create API key. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      toast({
        title: "Creation Failed",
        description: "Failed to create API key. Please try again.",
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
        title: "API Key Deleted",
        description: "The API key has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete API key. Please try again.",
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
        title: "Validation Error",
        description: "Please select at least one permission.",
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
          title: "API Key Updated",
          description: "Your API key has been updated successfully.",
        });
      }
    } catch (error) {
      console.error("Error updating API key:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update API key. Please try again.",
        variant: "destructive",
      });
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-zinc-100">API Keys</h2>
        {apiKeys.length < 10 && (
          <Button onClick={() => setIsCreatingApiKey(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        )}
      </div>

      <Card className="bg-white dark:bg-zinc-900 border-0 dark:border-zinc-800 shadow-sm">
        <CardHeader>
          <CardTitle className="dark:text-zinc-100">Your API Keys</CardTitle>
          <CardDescription className="dark:text-zinc-400">
            Manage API keys for programmatic access to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {apiKeyLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground dark:text-zinc-400 mt-2">
                Loading API Keys...
              </p>
            </div>
          ) : apiKeys.length > 0 ? (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => {
                return (
                  <div
                    key={apiKey.id}
                    className="border dark:border-zinc-700 rounded-lg p-4 space-y-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Key className="h-4 w-4 text-primary" />
                        </div>
                        <div className="font-medium dark:text-zinc-100">
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
                            Edit API Key
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => confirmDeleteApiKey(apiKey)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Key
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="bg-gray-50 dark:bg-zinc-800 p-2 rounded font-mono text-sm dark:text-zinc-300">
                      {apiKey.key.substring(0, 10)}****
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground dark:text-zinc-400">
                          Created:{" "}
                        </span>
                        {apiKey.createdAt
                          ? formatDate(apiKey.createdAt)
                          : "N/A"}
                      </div>

                      <div>
                        <span className="text-muted-foreground dark:text-zinc-400">
                          Permissions:{" "}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {apiKey.permissions?.map((permission: string) => (
                            <Badge
                              key={permission}
                              variant="outline"
                              className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            >
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground dark:text-zinc-400">
                          IP Restrictions:{" "}
                        </span>
                        {apiKey.ipRestriction &&
                        apiKey.ipWhitelist && 
                        (Array.isArray(apiKey.ipWhitelist) ? apiKey.ipWhitelist.length > 0 : apiKey.ipWhitelist.length > 0) ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(Array.isArray(apiKey.ipWhitelist) ? apiKey.ipWhitelist : apiKey.ipWhitelist.split(',')).map((ip: string) => (
                              <Badge
                                key={ip}
                                variant="outline"
                                className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700"
                              >
                                {ip}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm">No restrictions</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-full inline-flex mb-4">
                <Key className="h-6 w-6 text-gray-500 dark:text-zinc-400" />
              </div>
              <h3 className="text-lg font-medium dark:text-zinc-100">
                No API Keys
              </h3>
              <p className="text-muted-foreground dark:text-zinc-400 mt-1 mb-4">
                You haven't created any API keys yet
              </p>
              <Button onClick={() => setIsCreatingApiKey(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </div>
          )}

          {isCreatingApiKey && (
            <div className="border dark:border-zinc-700 rounded-lg p-4 space-y-4">
              <h3 className="font-medium dark:text-zinc-100">
                Create New API Key
              </h3>

              <div className="space-y-2">
                <Label htmlFor="apiKeyName" className="dark:text-zinc-200">
                  API Key Name
                </Label>
                <Input
                  id="apiKeyName"
                  placeholder="e.g., Trading Bot"
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="dark:text-zinc-200">Permissions</Label>
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
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-zinc-200"
                        >
                          {permission.label}
                        </label>
                        <p className="text-xs text-muted-foreground dark:text-zinc-400">
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
                      className="dark:text-zinc-200"
                    >
                      IP Restrictions
                    </Label>
                    <p className="text-sm text-muted-foreground dark:text-zinc-400">
                      Limit API key usage to specific IP addresses
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
                      className={ipError ? "border-red-500" : ""}
                    />
                    {ipError ? (
                      <p className="text-xs text-red-500">{ipError}</p>
                    ) : (
                      <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                        <Shield className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5" />
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                          <p className="font-medium">
                            Recommended Security Practice
                          </p>
                          <p>
                            Restricting API keys to specific IP addresses
                            significantly enhances security. Use your current IP
                            address or the server IP that will use this key.
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
                <Button onClick={handleCreateApiKey} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="mr-2">Creating...</span>
                      <span className="animate-spin">⟳</span>
                    </>
                  ) : (
                    "Create API Key"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Key Security Notice */}
      <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          API Key Security
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Keep your API keys secure. They provide programmatic access to your
          account. Never share your API keys or include them in client-side
          code.
        </AlertDescription>
      </Alert>

      {/* New API Key Dialog */}
      <Dialog open={showNewApiKey} onOpenChange={setShowNewApiKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Your new API key has been created. Please copy it now as you won't
              be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-50 dark:bg-zinc-800 p-3 rounded-md font-mono text-sm break-all dark:text-zinc-300">
            {newApiKey}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(newApiKey);
                toast({
                  title: "Copied",
                  description: "API key copied to clipboard",
                });
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button onClick={() => setShowNewApiKey(false)}>
              I've Saved My API Key
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
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update permissions and IP restrictions for this API key.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium dark:text-zinc-200">
                API Key Name
              </Label>
              <p className="font-medium mt-1 dark:text-zinc-100">
                {editingApiKey?.name}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-zinc-200">Permissions</Label>
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
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-zinc-200"
                      >
                        {permission.label}
                      </label>
                      <p className="text-xs text-muted-foreground dark:text-zinc-400">
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
                    className="dark:text-zinc-200"
                  >
                    IP Restrictions
                  </Label>
                  <p className="text-sm text-muted-foreground dark:text-zinc-400">
                    Limit API key usage to specific IP addresses
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
                    className={editIpError ? "border-red-500" : ""}
                  />
                  {editIpError ? (
                    <p className="text-xs text-red-500">{editIpError}</p>
                  ) : (
                    <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                      <Shield className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5" />
                      <div className="text-xs text-blue-700 dark:text-blue-300">
                        <p className="font-medium">
                          Recommended Security Practice
                        </p>
                        <p>
                          Restricting API keys to specific IP addresses
                          significantly enhances security. Use your current IP
                          address or the server IP that will use this key.
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
            <Button onClick={handleSaveApiKeyEdit}>Save Changes</Button>
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
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete API Key
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          {deletingApiKey && (
            <div className="border dark:border-zinc-700 rounded-lg p-3 bg-gray-50 dark:bg-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                <span className="font-medium dark:text-zinc-100">
                  {deletingApiKey.name}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-zinc-400">
                <div>
                  Created:{" "}
                  {deletingApiKey.createdAt
                    ? formatDate(deletingApiKey.createdAt)
                    : "N/A"}
                </div>
                <div className="mt-1">
                  Permissions: {deletingApiKey.permissions.join(", ")}
                </div>
              </div>
            </div>
          )}

          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Deleting this API key will immediately revoke access for any
              applications or services using it. Make sure you have updated any
              dependent systems before proceeding.
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
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="mr-2">Deleting...</span>
                  <span className="animate-spin">⟳</span>
                </>
              ) : (
                "Delete API Key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
