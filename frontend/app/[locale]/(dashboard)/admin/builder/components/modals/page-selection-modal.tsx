"use client";

import { useState, useEffect, useMemo } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { $fetch } from "@/lib/api";
import { useBuilderStore } from "@/store/builder-store";
import { SearchInput } from "./utils";
import Modal from "@/components/ui/modal";
import { ScrollableSnapshot } from "../../components/shared/scrollable-snapshot";
import { useRouter } from "@/i18n/routing";
interface Page {
  id: string;
  title: string;
  slug: string;
  lastModified: string;
  status: "published" | "draft";
  snapshots?: {
    card: string;
    preview: string;
  };
}
interface PageSelectionModalProps {
  onClose: () => void;
}
export function PageSelectionModal({ onClose }: PageSelectionModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { currentPageId } = useBuilderStore();
  useEffect(() => {
    const fetchPages = async () => {
      try {
        setIsLoading(true);
        const response = await $fetch<Page[]>({
          url: "/api/content/page",
          silentSuccess: true,
        });
        if (response.data) {
          // Fetch full page data to get snapshots
          const pagesWithContent = await Promise.all(
            response.data.map(async (page) => {
              if (!page.snapshots) {
                const pageResponse = await $fetch<Page>({
                  url: `/api/content/page/${page.id}`,
                  silentSuccess: true,
                });
                return pageResponse.data || page;
              }
              return page;
            })
          );
          setPages(pagesWithContent.filter(Boolean) as Page[]);
        } else {
          toast({
            title: "Error",
            description: "Failed to load pages",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to fetch pages:", error);
        toast({
          title: "Error",
          description: "Failed to load pages",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPages();
  }, [toast]);
  const filteredPages = useMemo(
    () =>
      pages.filter(
        (page) =>
          page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          page.slug.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [pages, searchQuery]
  );
  const handleSelectPage = (pageId: string) => {
    if (pageId === currentPageId) {
      onClose();
      return;
    }
    router.push(`/admin/builder/${pageId}`);
    onClose();
  };
  return (
    <Modal
      title="Select a Page to Edit"
      onClose={onClose}
      color="purple"
      showHeader={true}
      className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto"
    >
      <div className="p-4">
        <div className="flex items-center mb-4">
          <div className="relative flex-1">
            <SearchInput
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? "No pages match your search" : "No pages found"}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredPages.map((page) => {
              return (
                <div
                  key={page.id}
                  className={cn(
                    "border rounded-lg overflow-hidden cursor-pointer transition-all hover:border-purple-400 hover:shadow-md",
                    page.id === currentPageId &&
                      "ring-2 ring-purple-500 border-purple-500"
                  )}
                  onClick={() => handleSelectPage(page.id)}
                >
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    {page.snapshots?.card ? (
                      <ScrollableSnapshot
                        src={page.snapshots.card}
                        alt={page.title}
                        className="h-full"
                        fallbackSrc={`/placeholder.svg?height=200&width=400&text=${encodeURIComponent(page.title)}`}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-50">
                        <div className="text-center p-4">
                          <div className="text-muted-foreground text-sm">
                            No preview available
                          </div>
                        </div>
                      </div>
                    )}
                    <div
                      className={cn(
                        "absolute top-2 right-2 px-2 py-1 text-xs rounded-full",
                        page.status === "published"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      )}
                    >
                      {page.status === "published" ? "Published" : "Draft"}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium truncate">{page.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {page.slug}
                    </p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {new Date(page.lastModified).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPage(page.id);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
