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
import { columns } from "./columns";
import { analytics } from "./analytics";
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
  const t = useTranslations();
  const router = useRouter();
  const { hasPermission } = useUserStore();
  
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
      toast.error("Please provide a reason for blocking");
      return;
    }

    setIsLoading(true);

    try {
      await $fetch({
        url: `/api/admin/crm/user/${selectedUser.id}/block`,
        method: "POST",
        body: {
          reason,
          isTemporary: isTemporaryBlock,
          duration: isTemporaryBlock ? blockDuration : undefined,
        },
      });

      toast.success(isTemporaryBlock ? "User temporarily blocked" : "User blocked");
      setIsBlockDialogOpen(false);
      resetBlockForm();
      
      if (refresh) refresh();
    } catch (error) {
      toast.error("Failed to block user");
    } finally {
      setIsLoading(false);
    }
  }, [selectedUser, blockReason, customReason, isTemporaryBlock, blockDuration, resetBlockForm]);

  const handleUnblockUser = useCallback(async (user: any, refresh?: () => void) => {
    try {
      await $fetch({
        url: `/api/admin/crm/user/${user.id}/unblock`,
        method: "POST",
      });

      toast.success("User unblocked successfully");
      if (refresh) refresh();
    } catch (error) {
      toast.error("Failed to unblock user");
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
            Unblock User
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
            Block User
          </DropdownMenuItem>
        )}
      </>
    );
  }, [handleUnblockUser]); // Stable function reference

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        toast.error("Please select a valid CSV file");
        return;
      }
      setImportFile(file);
      setImportResults(null);
    }
  }, []);

  const handleImportUsers = useCallback(async (refresh?: () => void) => {
    if (!importFile) {
      toast.error("Please select a CSV file");
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
        toast.success(data?.message || "Users imported successfully");
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
      toast.error("Failed to import users");
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
    
    toast.success("Template downloaded successfully");
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
    pageSize: 10,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canView: true,
    viewLink: "/admin/crm/user/[id]",
    title: "User Management",
    itemTitle: "User",
    columns,
    analytics,
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
            Import Users
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
                toast.success("Users exported successfully");
              } else {
                toast.error("Failed to export users");
              }
            } catch (error) {
              toast.error("Failed to export users");
            }
          }}
          className="flex items-center gap-2"
          variant="outline"
        >
          <Download className="h-4 w-4" />
          Export to CSV
          </Button>
        )}
      </div>
    ),
  }), [renderActionButtons, canImport, canExport, setIsImportDialogOpen]);

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
            <DialogTitle className="text-red-600">
              Block User Account
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Block Type</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isTemporaryBlock}
                  onCheckedChange={setIsTemporaryBlock}
                />
                <Label>Temporary Block</Label>
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
                  <SelectValue placeholder="Select a reason" />
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
                <Label>Custom Reason</Label>
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom reason..."
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
                {isLoading ? "Blocking..." : "Block User"}
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
            <DialogTitle>Import Users from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import users. Download the template to see the required format.
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
                Download Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
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
                      <span>Choose CSV file...</span>
                    </div>
                  )}
                </Button>
              </div>
              {importFile && (
                <p className="text-xs text-muted-foreground">
                  Click to choose a different file
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
                placeholder="Enter default password"
                disabled={isImporting}
              />
              <p className="text-xs text-muted-foreground">
                This password will be used for users who don't have a password specified in the CSV.
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
                Send welcome email to imported users
              </Label>
            </div>

            {/* Import Results */}
            {importResults && (
              <Alert className={importResults.failed > 0 ? "border-yellow-500" : "border-green-500"}>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">
                      Import completed: {importResults.imported} successful, {importResults.failed} failed
                    </p>
                    {importResults.errors && importResults.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Errors:</p>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {importResults.errors.map((error: any, index: number) => (
                            <p key={index} className="text-xs text-red-600">
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
                <strong>CSV Format Requirements:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Required fields: email, firstName, lastName</li>
                  <li>Optional fields: password, phone, status, emailVerified, twoFactor, roleId, avatar</li>
                  <li>Profile fields: bio, address, city, country, zip</li>
                  <li>Social fields: facebook, twitter, instagram, github, dribbble, gitlab</li>
                  <li>Status values: ACTIVE, INACTIVE, BANNED, SUSPENDED</li>
                  <li>Boolean fields (emailVerified, twoFactor): true/false, yes/no, 1/0</li>
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
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Users
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
