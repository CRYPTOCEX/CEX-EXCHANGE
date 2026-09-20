"use client";
import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, ShieldOff, Upload, Download, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { useColumns, useFormConfig, useViewConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useUserStore } from "@/store/user";

const BLOCK_REASONS = [
  "Suspicious Activity",
  "Terms of Service Violation", 
  "Security Concerns",
  "Fraud Investigation",
  "Compliance Review",
  "Customer Request",
  "Other"
];

const DURATION_OPTIONS = [
  { label: "1 Hour", value: 1 },
  { label: "6 Hours", value: 6 },
  { label: "12 Hours", value: 12 },
  { label: "1 Day", value: 24 },
  { label: "3 Days", value: 72 },
  { label: "1 Week", value: 168 },
  { label: "2 Weeks", value: 336 },
  { label: "1 Month", value: 720 },
];

export default function UsersPage() {
  const tCommon = useTranslations("common");
  const t = useTranslations("dashboard_admin");
  const router = useRouter();
  const { hasPermission } = useUserStore();
  const columns = useColumns();
  const formConfig = useFormConfig();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();

  // Check permissions
  const canImport = hasPermission("import.user");
  const canExport = hasPermission("export.user");

  // Block dialog state
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isTemporaryBlock, setIsTemporaryBlock] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockDuration, setBlockDuration] = useState<number>(24);
  const [customReason, setCustomReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Import dialog state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [defaultPassword, setDefaultPassword] = useState("Welcome123!");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const resetBlockForm = useCallback(() => {
    setBlockReason("");
    setCustomReason("");
    setIsTemporaryBlock(false);
    setBlockDuration(24);
    setSelectedUser(null);
  }, []);

  const resetImportForm = useCallback(() => {
    setImportFile(null);
    setDefaultPassword("Welcome123!");
    setSendWelcomeEmail(false);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleBlockUser = useCallback(async (refresh?: () => void) => {
    if (!selectedUser) return;

    const reason = blockReason === "Other" ? customReason : blockReason;
    
    if (!reason.trim()) {
      toast.error(t("please_provide_a_reason_for_blocking"));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await $fetch({
        url: `/api/admin/crm/user/${selectedUser.id}/block`,
        method: "POST",
        body: {
          reason,
          isTemporary: isTemporaryBlock,
          duration: isTemporaryBlock ? blockDuration : undefined,
        },
      });

      if (error) {
        toast.error(typeof error === "string" ? error : t("failed_to_block_user"));
        return;
      }

      toast.success(isTemporaryBlock ? t("user_temporarily_blocked") : t("user_blocked"));
      setIsBlockDialogOpen(false);
      resetBlockForm();
      
      if (refresh) refresh();
    } catch (error) {
      toast.error(t("failed_to_block_user"));
    } finally {
      setIsLoading(false);
    }
  }, [selectedUser, blockReason, customReason, isTemporaryBlock, blockDuration, resetBlockForm]);

  const handleUnblockUser = useCallback(async (user: any, refresh?: () => void) => {
    try {
      const { error } = await $fetch({
        url: `/api/admin/crm/user/${user.id}/unblock`,
        method: "POST",
      });

      if (error) {
        toast.error(typeof error === "string" ? error : t("failed_to_unblock_user"));
        return;
      }

      toast.success(t("user_unblocked_successfully"));
      if (refresh) refresh();
    } catch (error) {
      toast.error(t("failed_to_unblock_user"));
    }
  }, []); // No dependencies needed for this function

  // Extra row actions for dropdown menu - memoized to prevent unnecessary re-renders
  const renderActionButtons = useCallback((row: any) => {
    const isBlocked = row.status === "SUSPENDED" || row.status === "BANNED";

    return (
      <>
        {isBlocked ? (
          <DropdownMenuItem
            onClick={() => handleUnblockUser(row, () => window.location.reload())}
            className="cursor-pointer text-foreground"
          >
            <ShieldOff className="mr-2 h-4 w-4" />
            {t("unblock_user")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => {
              setSelectedUser(row);
              setIsBlockDialogOpen(true);
            }}
            className="cursor-pointer text-destructive"
          >
            <Shield className="mr-2 h-4 w-4" />
            {t("block_user")}
          </DropdownMenuItem>
        )}
      </>
    );
  }, [handleUnblockUser]); // Stable function reference

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error(t("please_select_a_valid_csv_file"));
        return;
      }
      setImportFile(file);
      setImportResults(null);
    }
  }, []);

  const handleImportUsers = useCallback(async (refresh?: () => void) => {
    if (!importFile) {
      toast.error(t("please_select_a_csv_file"));
      return;
    }

    setIsImporting(true);
    setImportResults(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject("Error reading file");
      });
      reader.readAsDataURL(importFile);
      const base64File = await base64Promise;

      const { data, error } = await $fetch({
        url: "/api/admin/crm/user/import",
        method: "POST",
        body: {
          file: base64File,
          defaultPassword,
          sendWelcomeEmail: sendWelcomeEmail.toString(),
        },
      });

      if (error) {
        toast.error(error);
        if (data?.errors) {
          setImportResults(data);
        }
      } else {
        toast.success(data?.message || t("users_imported_successfully"));
        setImportResults(data);
        
        // If all imports were successful, close dialog and refresh
        if (data?.failed === 0) {
          setTimeout(() => {
            setIsImportDialogOpen(false);
            resetImportForm();
            if (refresh) refresh();
          }, 2000);
        }
      }
    } catch (error) {
      toast.error(t("failed_to_import_users"));
    } finally {
      setIsImporting(false);
    }
  }, [importFile, defaultPassword, sendWelcomeEmail, resetImportForm]);

  const downloadTemplate = useCallback(() => {
    const csvContent = `email,firstName,lastName,password,phone,status,emailVerified,twoFactor,roleId,avatar,bio,address,city,country,zip,facebook,twitter,instagram,github,dribbble,gitlab
john.doe@example.com,John,Doe,,+1234567890,ACTIVE,true,false,,,Software Developer,123 Main St,New York,USA,10001,https://facebook.com/johndoe,https://twitter.com/johndoe,,,https://github.com/johndoe,
jane.smith@example.com,Jane,Smith,CustomPass123,+0987654321,ACTIVE,false,false,,,Marketing Manager,456 Oak Ave,Los Angeles,USA,90001,,,,,,`;
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success(t("template_downloaded_successfully"));
  }, [])



  // Memoize DataTable props to prevent unnecessary re-renders
  const dataTableProps = useMemo(() => ({
    apiEndpoint: "/api/admin/crm/user",
    model: "user",
    permissions: {
      access: "access.user",
      view: "view.user",
      create: "create.user",
      edit: "edit.user",
      delete: "delete.user",
    },
    pageSize: 12,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canView: true,
    viewLink: "/admin/crm/user/[id]",
    title: t("user_management"),
    description: t("manage_user_accounts_roles_and_permissions"),
    itemTitle: "User",
    columns,
    formConfig,
    viewConfig,
    analytics,
    design: {
      icon: Shield,
    },
    extraRowActions: renderActionButtons,
    extraTopButtons: (refresh?: () => void) => (
      <div className="flex gap-2">
        {canImport && (
          <Button
            onClick={() => setIsImportDialogOpen(true)}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Upload className="h-4 w-4" />
            {t("import_users")}
          </Button>
        )}
        {canExport && (
          <Button
          onClick={async () => {
            try {
              const response = await fetch("/api/admin/crm/user/export-csv", {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              });

              if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast.success(t("users_exported_successfully"));
              } else {
                toast.error(t("failed_to_export_users"));
              }
            } catch (error) {
              toast.error(t("failed_to_export_users"));
            }
          }}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Download className="h-4 w-4" />
          {t("export_to_csv")}
          </Button>
        )}
      </div>
    ),
  }), [columns, formConfig, viewConfig, renderActionButtons, canImport, canExport, setIsImportDialogOpen]);

  return (
    <>
      <DataTable {...dataTableProps} />

      {/* Block User Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={(open) => {
        setIsBlockDialogOpen(open);
        if (!open) resetBlockForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("block_user_account")}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("block_type")}</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isTemporaryBlock}
                  onCheckedChange={setIsTemporaryBlock}
                />
                <Label>{t("temporary_block_auto_unblock_after_duration")}</Label>
              </div>
            </div>

            {isTemporaryBlock && (
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select 
                  value={blockDuration.toString()} 
                  onValueChange={(value) => setBlockDuration(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={blockReason} onValueChange={setBlockReason}>
                <SelectTrigger>
                  <SelectValue placeholder={tCommon("select_a_reason")} />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {blockReason === "Other" && (
              <div className="space-y-2">
                <Label>{t("custom_reason")}</Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder={`${t("enter_custom_reason")}…`}
                />
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleBlockUser(() => window.location.reload())}
                disabled={isLoading || !blockReason}
              >
                {isLoading ? `${t("blocking")}…` : t("block_user")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Users Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) resetImportForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("import_users_from_csv")}</DialogTitle>
            <DialogDescription>
              {t("upload_a_csv_file_to_bulk")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Download Template Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {tCommon("download_template")}
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csv-file">{t("csv_file")}</Label>
              <div className="relative">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={isImporting}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal hover:bg-accent hover:text-accent-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {importFile ? (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{importFile.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        ({(importFile.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      <span>{t("choose_csv_file")}…</span>
                    </div>
                  )}
                </Button>
              </div>
              {importFile && (
                <p className="text-xs text-muted-foreground">
                  {t("click_to_choose_a_different_file")}
                </p>
              )}
            </div>

            {/* Default Password */}
            <div className="space-y-2">
              <Label htmlFor="default-password">
                Default Password (for users without password in CSV)
              </Label>
              <Input
                id="default-password"
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder={t("enter_default_password")}
                disabled={isImporting}
              />
              <p className="text-xs text-muted-foreground">
                {t("this_password_will_be_used_for")}
              </p>
            </div>

            {/* Send Welcome Email */}
            <div className="flex items-center space-x-2">
              <Switch
                id="send-welcome"
                checked={sendWelcomeEmail}
                onCheckedChange={setSendWelcomeEmail}
                disabled={isImporting}
              />
              <Label htmlFor="send-welcome">
                {t("send_welcome_email_to_imported_users")}
              </Label>
            </div>

            {/* Import Results */}
            {importResults && (
              <Alert className={importResults.failed > 0 ? "border-warning" : "border-success"}>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">
                      {t("import_completed")}: {importResults.imported} successful, {importResults.failed} failed
                    </p>
                    {importResults.errors && importResults.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">{tCommon("errors")}:</p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {importResults.errors.map((error: any, index: number) => (
                            <p key={index} className="text-xs text-destructive">
                              Row {error.row}: {error.email} - {error.error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* CSV Format Info */}
            <Alert>
              <AlertDescription className="text-xs">
                <strong>{t("csv_format_requirements")}:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>{t("required_fields_email_firstname_lastname")}</li>
                  <li>{t("optional_fields_password_phone_status_emailverified")}</li>
                  <li>{t("profile_fields_bio_address_city_country_zip")}</li>
                  <li>{t("social_fields_facebook_twitter_instagram_github")}</li>
                  <li>{t("status_values_active_inactive_banned_suspended")}</li>
                  <li>{t("boolean_fields_emailverified_twofactor_true_false")}</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsImportDialogOpen(false);
                  resetImportForm();
                }}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleImportUsers(() => window.location.reload())}
                disabled={isImporting || !importFile}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tCommon("importing")}…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("import_users")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
