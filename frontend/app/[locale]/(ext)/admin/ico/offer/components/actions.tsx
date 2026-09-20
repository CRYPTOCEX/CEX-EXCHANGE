"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Eye,
  CheckCircle,
  X,
  PauseCircle,
  PlayCircle,
  Flag,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/routing";
import { useAdminOfferStore } from "@/store/ico/admin/admin-offer-store";
import { useTranslations } from "next-intl";

interface OfferingActionsProps {
  offering: icoTokenOfferingAttributes;
  status: string;
  processingId: string | null;
  setProcessingId: (id: string | null) => void;
}

export function OfferingActions({
  offering,
  processingId,
  setProcessingId,
}: OfferingActionsProps) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const {
    approveOffering,
    rejectOffering,
    pauseOffering,
    resumeOffering,
    flagOffering,
    unflagOffering,
    deleteOffering,
  } = useAdminOfferStore();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const handleView = () => {
    router.push(`/admin/ico/offer/${offering.id}`);
  };

  const handleApprove = async () => {
    setProcessingId(offering.id);
    try {
      await approveOffering(offering.id);
      // Optionally show a success message here.
    } catch (error) {
      console.error("Approve action failed:", error);
      // Optionally, display a user-friendly error message (e.g., toast/alert).
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = () => {
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (notes.trim()) {
      setProcessingId(offering.id);
      try {
        await rejectOffering(offering.id, notes);
        setRejectDialogOpen(false);
        setNotes("");
      } catch (error) {
        console.error("Reject action failed:", error);
        // Optionally, display a user-friendly error message.
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handlePauseResume = async () => {
    setProcessingId(offering.id);
    try {
      if (offering.isPaused) {
        await resumeOffering(offering.id);
      } else {
        await pauseOffering(offering.id);
      }
    } catch (error) {
      console.error("Pause/Resume action failed:", error);
      // Optionally, display a user-friendly error message.
    } finally {
      setProcessingId(null);
    }
  };

  const openFlagDialog = () => {
    setFlagDialogOpen(true);
  };

  const handleFlag = async () => {
    if (notes.trim()) {
      setProcessingId(offering.id);
      try {
        await flagOffering(offering.id, notes);
        setFlagDialogOpen(false);
        setNotes("");
      } catch (error) {
        console.error("Flag action failed:", error);
        // Optionally, display a user-friendly error message.
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleUnflag = async () => {
    setProcessingId(offering.id);
    try {
      await unflagOffering(offering.id);
    } catch (error) {
      console.error("Unflag action failed:", error);
      // Optionally, display a user-friendly error message.
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async () => {
    setProcessingId(offering.id);
    try {
      await deleteOffering(offering.id);
      setDeleteDialogOpen(false);
      // Redirect to offerings list
      router.push("/admin/ico/offer");
    } catch (error) {
      console.error("Delete action failed:", error);
      // Optionally, display a user-friendly error message.
    } finally {
      setProcessingId(null);
    }
  };

  const isPending = offering.status === "PENDING";
  const isActive = offering.status === "ACTIVE";
  const isRejected = offering.status === "REJECTED";
  const isFailed = offering.status === "FAILED";
  const isCompleted =
    offering.status === "SUCCESS" || offering.status === "FAILED";
  const isPaused = offering.isPaused || false;
  const isFlagged = offering.isFlagged || false;
  const canDelete = isPending || isRejected || isFailed;

  const renderActionButtons = () => {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleView}>
          <Eye className="h-4 w-4 mr-1" />
          {tCommon("view")}
        </Button>

        {isPending && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
              onClick={handleApprove}
              disabled={processingId === offering.id}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              {tCommon("approve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={openRejectDialog}
              disabled={processingId === offering.id}
            >
              <X className="h-4 w-4 mr-1" />
              {tCommon("reject")}
            </Button>
          </>
        )}

        {isActive && (
          <>
            <Button
              size="sm"
              variant="outline"
              className={
                isPaused
                  ? "text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                  : "text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
              }
              onClick={handlePauseResume}
              disabled={processingId === offering.id}
            >
              {isPaused ? (
                <>
                  <PlayCircle className="h-4 w-4 mr-1" />
                  {tCommon("resume")}
                </>
              ) : (
                <>
                  <PauseCircle className="h-4 w-4 mr-1" />
                  {tCommon("pause")}
                </>
              )}
            </Button>
          </>
        )}

        {!isPending && (
          <>
            {isFlagged ? (
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={handleUnflag}
                disabled={processingId === offering.id}
              >
                <Flag className="h-4 w-4 mr-1" />
                {t("unflag")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={openFlagDialog}
                disabled={processingId === offering.id}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                {t("flag")}
              </Button>
            )}
          </>
        )}

        {canDelete && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={processingId === offering.id}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {tCommon("delete")}
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      {renderActionButtons()}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reject_offering")}</DialogTitle>
            <DialogDescription>
              {t("please_provide_a_this_offering")}.{" "}
              {t("this_information_will_project_team")}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={tCommon('enter_rejection_reason')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!notes.trim() || processingId !== null}
            >
              {t("reject_offering")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("flag_offering")}</DialogTitle>
            <DialogDescription>
              {t("please_provide_a_reason_for_flagging_this_offering")}.{" "}
              {t("this_will_mark_the_offering_for_review")}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("enter_flag_reason_ellipsis")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleFlag}
              disabled={!notes.trim() || processingId !== null}
            >
              {t("flag_offering")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCommon("delete")} {tExt("offering")}</DialogTitle>
            <DialogDescription>
              {t("are_you_sure_delete_offering_cannot_undone")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={processingId !== null}
            >
              {tCommon("delete")} {tExt("offering")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
