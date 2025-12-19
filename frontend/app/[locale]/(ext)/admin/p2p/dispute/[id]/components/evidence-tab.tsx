"use client";

import { useState, useRef } from "react";
import { FileText, Image as ImageIcon, X, ZoomIn, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { useAdminDisputesStore } from "@/store/p2p/admin-disputes-store";

interface EvidenceTabProps {
  dispute: any;
}

function formatTimestamp(timestamp: string): string {
  try {
    return format(new Date(timestamp), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return timestamp;
  }
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
}

export function EvidenceTab({ dispute }: EvidenceTabProps) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadEvidence, isUploadingEvidence } = useAdminDisputesStore();

  // Safely get evidence array
  const evidenceList = Array.isArray(dispute?.evidence) ? dispute.evidence : [];

  const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

  const isValidImageFile = (file: File): boolean => {
    return allowedImageTypes.includes(file.type.toLowerCase());
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dispute?.id) return;

    if (!isValidImageFile(file)) {
      alert(t("only_image_files_allowed"));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    try {
      await uploadEvidence(dispute.id, file);
    } catch (error) {
      console.error("Failed to upload evidence:", error);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file || !dispute?.id) return;

    if (!isValidImageFile(file)) {
      alert(t("only_image_files_allowed"));
      return;
    }

    try {
      await uploadEvidence(dispute.id, file);
    } catch (error) {
      console.error("Failed to upload evidence:", error);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Filter evidence by submitter
  const buyerEvidence = evidenceList.filter((e: any) =>
    e.submittedBy === "buyer" || e.submittedBy === "reporter"
  );
  const sellerEvidence = evidenceList.filter((e: any) =>
    e.submittedBy === "seller" || e.submittedBy === "against"
  );
  const adminEvidence = evidenceList.filter((e: any) =>
    e.submittedBy === "admin"
  );

  const renderEvidenceItem = (evidence: any, index: number) => {
    const isImage = evidence.fileUrl && isImageUrl(evidence.fileUrl);

    return (
      <div key={index} className="rounded-md border p-3">
        <div className="flex items-start gap-3">
          {isImage ? (
            <button
              onClick={() => setLightboxImage(evidence.fileUrl)}
              className="relative group rounded-lg overflow-hidden border bg-background hover:ring-2 hover:ring-primary transition-all shrink-0"
            >
              <img
                src={evidence.fileUrl}
                alt={evidence.title || "Evidence"}
                className="h-16 w-16 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ) : (
            <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{evidence.title || evidence.fileName || "Evidence"}</p>
            <p className="text-xs text-muted-foreground">
              {evidence.timestamp && formatTimestamp(evidence.timestamp)}
            </p>
            {evidence.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {evidence.description}
              </p>
            )}
          </div>
          {evidence.fileUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isImage) {
                  setLightboxImage(evidence.fileUrl);
                } else {
                  window.open(evidence.fileUrl, "_blank");
                }
              }}
            >
              {tCommon("view")}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("evidence_submitted")}</CardTitle>
          <CardDescription>
            {t("documents_and_evidence_provided_by_both_parties")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Reporter/Buyer Evidence */}
            <div>
              <h3 className="mb-3 font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {t("reporter_evidence")}
              </h3>
              <div className="space-y-3">
                {buyerEvidence.length > 0 ? (
                  buyerEvidence.map((evidence: any, index: number) =>
                    renderEvidenceItem(evidence, index)
                  )
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t("no_evidence_submitted_by_reporter")}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Against/Seller Evidence */}
            <div>
              <h3 className="mb-3 font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                {t("against_evidence")}
              </h3>
              <div className="space-y-3">
                {sellerEvidence.length > 0 ? (
                  sellerEvidence.map((evidence: any, index: number) =>
                    renderEvidenceItem(evidence, index)
                  )
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t("no_evidence_submitted_by_against")}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Evidence */}
            {adminEvidence.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 font-medium flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    {t("admin_evidence")}
                  </h3>
                  <div className="space-y-3">
                    {adminEvidence.map((evidence: any, index: number) =>
                      renderEvidenceItem(evidence, index)
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Upload Section */}
            <div>
              <h3 className="mb-3 font-medium">{t("upload_additional_evidence")}</h3>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                disabled={isUploadingEvidence}
              />
              <div
                className="rounded-md border border-dashed p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={handleUploadClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {isUploadingEvidence ? (
                  <>
                    <Loader2 className="mx-auto h-8 w-8 text-muted-foreground animate-spin" />
                    <p className="mt-2 text-sm font-medium">
                      {tCommon('uploading_ellipsis')}...
                    </p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">
                      {t("drag_and_drop_images_here")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("supported_formats")}{t("jpeg_png_gif_webp")}
                    </p>
                    <Button variant="outline" size="sm" className="mt-4" disabled={isUploadingEvidence}>
                      {tCommon("upload_image")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxImage}
            alt={tExt("full_size")}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
