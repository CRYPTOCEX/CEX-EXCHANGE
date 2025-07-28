"use client";
import { useState, useCallback, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, ShieldOff } from "lucide-react";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { columns } from "./columns";
import { analytics } from "./analytics";

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

  // Block dialog state
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isTemporaryBlock, setIsTemporaryBlock] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockDuration, setBlockDuration] = useState<number>(24);
  const [customReason, setCustomReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);



  const resetBlockForm = useCallback(() => {
    setBlockReason("");
    setCustomReason("");
    setIsTemporaryBlock(false);
    setBlockDuration(24);
    setSelectedUser(null);
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
  }), [renderActionButtons]);

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
    </>
  );
}
