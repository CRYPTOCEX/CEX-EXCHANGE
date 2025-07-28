"use client";

import { useState, useEffect, useCallback } from "react";
import { useFAQAdminStore } from "@/store/faq/admin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { FAQForm } from "./faq-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "@/i18n/routing";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function FAQFormPage() {
  const t = useTranslations("ext");
  const searchParams = useSearchParams();
  const defaultPagePath = searchParams.get("page") || "";
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();
  const {
    faqs,
    fetchFAQs,
    fetchPageLinks,
    pageLinks,
    createFAQ,
    updateFAQ,
    deleteFAQ,
  } = useFAQAdminStore();

  const [faq, setFaq] = useState<Partial<faqAttributes>>(() => {
    // Initialize with empty FAQ for new, or find existing FAQ
    if (id === "new") {
      return {
        question: "",
        answer: "",
        image: "",
        category: "",
        pagePath: defaultPagePath,
        tags: [],
        order: 0,
        status: true,
      };
    }

    const existingFaq = faqs.find((f) => f.id === id);
    return existingFaq || {};
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isNewFAQ = id === "new";
  const pageTitle = isNewFAQ ? "Create New FAQ" : "Edit FAQ";

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const promises: Promise<void>[] = [];
        // Only fetch if there are no pages or FAQs already loaded
        if (faqs.length === 0) promises.push(fetchFAQs());
        if (pageLinks.length === 0) promises.push(fetchPageLinks());
        if (promises.length > 0) {
          await Promise.all(promises);
        }
        // For an existing FAQ, verify that it exists
        if (!isNewFAQ) {
          const existingFAQ = faqs.find((f) => f.id === id);
          if (!existingFAQ) {
            toast({
              title: "FAQ not found",
              description: "The FAQ you're trying to edit could not be found.",
              variant: "destructive",
            });
            router.push("/admin/faq/manage");
            return;
          }
          setFaq(existingFAQ);
        }
      } catch (error) {
        console.error("Error loading FAQ data:", error);
        toast({
          title: "Error",
          description: "Failed to load FAQ data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isNewFAQ]);

  const handleSave = useCallback(async () => {
    if (!faq) return;

    // Validate required fields
    if (!faq.question || !faq.answer || !faq.category || !faq.pagePath) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      if (isNewFAQ) {
        await createFAQ(faq);
      } else {
        await updateFAQ(id, faq);
      }

      // Navigate back to the FAQ list
      router.push("/admin/faq/manage");
    } catch (error) {
      console.error("Error saving FAQ:", error);
    } finally {
      setSubmitting(false);
    }
  }, [faq, isNewFAQ, createFAQ, updateFAQ, id, router, toast]);

  const handleDelete = useCallback(async () => {
    if (isNewFAQ) return;

    try {
      await deleteFAQ(id);
      router.push("/admin/faq/manage");
    } catch (error) {
      console.error("Error deleting FAQ:", error);
    }
  }, [isNewFAQ, deleteFAQ, id, router, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        {t("Loading")}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/admin/faq")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{pageTitle}</h1>
              <p className="text-sm text-muted-foreground">
                {t("make_changes_to_your_faq_here")}.{" "}
                {t("click_save_when_youre_done")}.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isNewFAQ && (
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("Delete")}
              </Button>
            )}

            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  {isNewFAQ ? "Creating..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isNewFAQ ? "Create FAQ" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      <FAQForm
        faq={faq}
        isEditing={!isNewFAQ}
        availablePages={pageLinks}
        isLoadingPages={loading}
        onChange={setFaq}
        faqs={faqs}
        isSubmitting={submitting}
        onCancel={() => router.push("/admin/faq")}
        onSubmit={handleSave}
      />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_faq")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("this_will_permanently_delete_the_faq")}
              {faq?.question}
              .<br />
              <br />
              {t("this_action_cannot_be_undone")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
