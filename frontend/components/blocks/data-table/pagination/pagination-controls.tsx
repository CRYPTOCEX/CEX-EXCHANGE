import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "../store";

export function PaginationControls() {
  const page = useTableStore((state) => state.page);
  const totalPages = useTableStore((state) => state.totalPages);
  const setPage = useTableStore((state) => state.setPage);
  const paginationLoading = useTableStore((state) => state.paginationLoading);
  const [clickedButton, setClickedButton] = React.useState<string | null>(null);

  const canPreviousPage = page > 1;
  const canNextPage = page < totalPages;

  const handleGotoFirst = () => {
    setClickedButton("first");
    setPage(1);
  };

  const handlePrevious = () => {
    setClickedButton("previous");
    setPage(page - 1);
  };

  const handleNext = () => {
    setClickedButton("next");
    setPage(page + 1);
  };

  const handleGotoLast = () => {
    setClickedButton("last");
    setPage(totalPages);
  };

  return (
    <div
      className={cn(
        "flex items-center",
        "ltr:flex-row rtl:flex-row-reverse ltr:space-x-2 rtl:space-x-reverse"
      )}
    >
      <Button
        variant="outline"
        className="hidden h-8 w-8 p-0 lg:flex"
        onClick={handleGotoFirst}
        disabled={!canPreviousPage || paginationLoading}
      >
        <span className="sr-only">Go to first page</span>
        {paginationLoading && clickedButton === "first" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronsLeft className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={handlePrevious}
        disabled={!canPreviousPage || paginationLoading}
      >
        <span className="sr-only">Go to previous page</span>
        {paginationLoading && clickedButton === "previous" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={handleNext}
        disabled={!canNextPage || paginationLoading}
      >
        <span className="sr-only">Go to next page</span>
        {paginationLoading && clickedButton === "next" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        className="hidden h-8 w-8 p-0 lg:flex"
        onClick={handleGotoLast}
        disabled={!canNextPage || paginationLoading}
      >
        <span className="sr-only">Go to last page</span>
        {paginationLoading && clickedButton === "last" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronsRight className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
