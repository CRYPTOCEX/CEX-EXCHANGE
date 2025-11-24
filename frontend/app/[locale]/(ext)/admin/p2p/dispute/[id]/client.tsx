"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAdminDisputesStore } from "@/store/p2p/admin-disputes-store";

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
  const [messageText, setMessageText] = useState("");

  const {
    dispute,
    isLoadingDispute,
    disputesError,
    fetchDispute,
    resolveDispute,
    addNote,
    sendMessage,
    clearError,
  } = useAdminDisputesStore();

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

    try {
      setIsSubmitting(true);
      setActionMessage(null);

      await resolveDispute(disputeId, resolutionDetails);

      setActionMessage({
        type: "success",
        message: `Dispute successfully resolved for ${
          resolutionDetails.outcome === "buyer"
            ? "buyer"
            : resolutionDetails.outcome === "seller"
              ? "seller"
              : "both parties"
        }`,
      });

      // In a real app, we might redirect after a delay
      setTimeout(() => {
        router.push("/admin/disputes?success=dispute-resolved");
      }, 2000);
    } catch (err) {
      setActionMessage({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to resolve dispute",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      setActionMessage({
        type: "error",
        message: "Please enter a message",
      });
      return;
    }

    try {
      await sendMessage(disputeId, messageText);
      setMessageText("");
      setActionMessage({
        type: "success",
        message: "Message sent to both parties",
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to send message",
      });
    }
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

  if (isLoadingDispute) {
    return <LoadingSkeleton />;
  }

  if (disputesError) {
    return <ErrorDisplay error={disputesError} clearError={clearError} />;
  }

  if (!dispute) {
    return null;
  }

  return (
    <div className="space-y-6">
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
            messageText={messageText}
            setMessageText={setMessageText}
            handleSendMessage={handleSendMessage}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {dispute.status !== "resolved" ? (
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
