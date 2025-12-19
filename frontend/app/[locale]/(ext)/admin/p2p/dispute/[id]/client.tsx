"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAdminDisputesStore } from "@/store/p2p/admin-disputes-store";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

import { DisputeBreadcrumb } from "./components/dispute-breadcrumb";
import { BackButton } from "./components/back-button";
import { DisputeHeader } from "./components/dispute-header";
import { DisputeTabs } from "./components/dispute-tabs";
import { ResolutionForm } from "./components/resolution-form";
import { ResolutionDetails } from "./components/resolution-details";
import { AdminNotes } from "./components/admin-notes";
import { UserHistory } from "./components/user-history";
import { LoadingSkeleton } from "./components/loading-skeleton";
import { ErrorDisplay } from "./components/error-display";
import { ActionMessage } from "./components/action-message";
import { useRouter } from "@/i18n/routing";

export default function AdminDisputeDetailsClient() {
  const router = useRouter();
  const params = useParams();
  const disputeId = params?.id as string;

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [resolutionDetails, setResolutionDetails] = useState({
    outcome: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [noteText, setNoteText] = useState("");

  const {
    dispute,
    isLoadingDispute,
    disputesError,
    disputeError,
    resolvingDisputeError,
    fetchDispute,
    resolveDispute,
    addNote,
    clearError,
  } = useAdminDisputesStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (disputeId) {
      fetchDispute(disputeId);
    }
  }, [disputeId, fetchDispute]);

  useEffect(() => {
    // Clear any action messages after 5 seconds
    if (actionMessage) {
      const timer = setTimeout(() => {
        setActionMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  const handleResolveDispute = async () => {
    if (!resolutionDetails.outcome) {
      setActionMessage({
        type: "error",
        message: "Please select a resolution outcome",
      });
      return;
    }

    setIsSubmitting(true);
    setActionMessage(null);

    await resolveDispute(disputeId, resolutionDetails);

    // Check if there was an error from the store
    const storeError = useAdminDisputesStore.getState().resolvingDisputeError;
    if (storeError) {
      setActionMessage({
        type: "error",
        message: storeError,
      });
      setIsSubmitting(false);
      return;
    }

    const outcomeLabel =
      resolutionDetails.outcome === "BUYER_WINS"
        ? "buyer"
        : resolutionDetails.outcome === "SELLER_WINS"
          ? "seller"
          : "both parties";

    setActionMessage({
      type: "success",
      message: `Dispute successfully resolved for ${outcomeLabel}`,
    });

    setIsSubmitting(false);

    // Redirect after showing success message
    setTimeout(() => {
      router.push("/admin/p2p/dispute?success=dispute-resolved");
    }, 2000);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) {
      setActionMessage({
        type: "error",
        message: "Please enter a note",
      });
      return;
    }

    try {
      await addNote(disputeId, noteText);
      setNoteText("");
      setActionMessage({
        type: "success",
        message: "Note added successfully",
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to add note",
      });
    }
  };

  if (!mounted || isLoadingDispute) {
    return <LoadingSkeleton />;
  }

  if (disputesError || disputeError) {
    return <ErrorDisplay error={disputesError || disputeError || "Unknown error"} clearError={clearError} />;
  }

  if (!dispute) {
    return <LoadingSkeleton />;
  }

  return (
    <div className={`container ${PAGE_PADDING} space-y-6`}>
      {/* Breadcrumb and back button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DisputeBreadcrumb disputeId={disputeId} />
        <BackButton />
      </div>

      {/* Dispute header */}
      <DisputeHeader
        id={dispute.id}
        status={dispute.status}
        filedOn={dispute.filedOn}
        tradeId={dispute.tradeId}
        priority={dispute.priority}
        dispute={dispute}
      />

      {/* Action message */}
      <ActionMessage actionMessage={actionMessage} />

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <DisputeTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            dispute={dispute}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {dispute.status !== "RESOLVED" ? (
            <ResolutionForm
              resolutionDetails={resolutionDetails}
              setResolutionDetails={setResolutionDetails}
              handleResolveDispute={handleResolveDispute}
              isSubmitting={isSubmitting}
            />
          ) : (
            <ResolutionDetails dispute={dispute} />
          )}

          <AdminNotes
            dispute={dispute}
            noteText={noteText}
            setNoteText={setNoteText}
            handleAddNote={handleAddNote}
          />

          <UserHistory dispute={dispute} />
        </div>
      </div>
    </div>
  );
}
