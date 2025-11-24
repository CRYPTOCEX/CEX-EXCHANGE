"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Calendar,
  User,
  Hash,
  Link2,
  MessageSquare,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface FeedbackDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: {
    id: string;
    faqId: string;
    userId?: string;
    sessionId: string;
    isHelpful: boolean;
    comment?: string;
    createdAt: string;
  };
  faq?: {
    id: string;
    question: string;
  };
}

export function FeedbackDetailsDialog({
  open,
  onOpenChange,
  feedback,
  faq,
}: FeedbackDetailsDialogProps) {
  const t = useTranslations("ext");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{t("feedback_details")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-lg font-medium mb-2">{t("faq_question")}</h3>
            <div className="flex items-start justify-between">
              <p className="text-base">
                {faq ? faq.question : `FAQ ID: ${feedback.faqId}`}
              </p>
              <Badge
                variant={feedback.isHelpful ? "outline" : "destructive"}
                className="ml-2"
              >
                {feedback.isHelpful ? (
                  <>
                    <ThumbsUp className="h-3 w-3 mr-1" />
                    {t("Helpful")}
                  </>
                ) : (
                  <>
                    <ThumbsDown className="h-3 w-3 mr-1" />
                    {t("not_helpful")}
                  </>
                )}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Hash className="h-4 w-4 mr-1" />
                {t("feedback_id")}
              </h4>
              <p className="text-sm bg-muted p-2 rounded">{feedback.id}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {t("date_submitted")}
              </h4>
              <p className="text-sm bg-muted p-2 rounded">
                {new Date(feedback.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <User className="h-4 w-4 mr-1" />
                {t("user_id")}
              </h4>
              <p className="text-sm bg-muted p-2 rounded">
                {feedback.userId || "Anonymous"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <Link2 className="h-4 w-4 mr-1" />
                {t("faq_link")}
              </h4>
              <p className="text-sm bg-muted p-2 rounded truncate">
                <Link
                  href={`/faq/${feedback.faqId}`}
                  className="text-blue-600 hover:underline"
                >
                  {'/faq/'}
                  {feedback.faqId}
                </Link>
              </p>
            </div>
          </div>

          {feedback.comment && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {t("user_comment")}
                </h4>
                <div className="bg-muted p-4 rounded-md border">
                  {feedback.comment}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Close")}
          </Button>
          <Link href={`/admin/faq/${feedback.faqId}`}>
            <Button variant={feedback.isHelpful ? "default" : "destructive"}>
              <ExternalLink className="h-4 w-4 mr-1" />
              {t("view_faq")}
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
