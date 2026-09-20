"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface PreviewFAQDialogProps {
  faq: faqAttributes | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export function PreviewFAQDialog({
  faq,
  open,
  onOpenChange,
  onEdit,
}: PreviewFAQDialogProps) {
  const t = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  if (!faq) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tExtAdmin("preview_faq")}</DialogTitle>
          <DialogDescription>
            {tExtAdmin("this_is_how_the_faq_will_appear_to_users")}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">{faq.question}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {faq.category && <Badge variant="outline">{faq.category}</Badge>}
              {faq.status ? (
                <Badge variant="default" className="bg-green-500">
                  {t("active")}
                </Badge>
              ) : (
                <Badge variant="secondary">{t("inactive")}</Badge>
              )}
              <Badge variant="outline">{faq.pagePath}</Badge>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
            </div>

            {/* Display answer image if available */}
            {faq.image && (
              <div className="mt-4 rounded-md overflow-hidden border">
                <Image
                  src={faq.image || "/img/placeholder.svg"}
                  alt={tExt("answer_illustration")}
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover"
                  unoptimized
                />
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">
              {t("additional_information")}
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">{tExtAdmin("page_path")}</dt>
                <dd>{faq.pagePath || "None"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("tags")}</dt>
                <dd>
                  {faq.tags && faq.tags.length > 0
                    ? faq.tags.join(", ")
                    : "None"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{tExtAdmin("related_faqs")}</dt>
                <dd>
                  {faq.relatedFaqIds && faq.relatedFaqIds.length > 0
                    ? faq.relatedFaqIds.length
                    : "None"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("last_updated")}</dt>
                <dd>
                  {faq.updatedAt
                    ? new Date(faq.updatedAt).toLocaleDateString()
                    : "N/A"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close")}
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("edit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
