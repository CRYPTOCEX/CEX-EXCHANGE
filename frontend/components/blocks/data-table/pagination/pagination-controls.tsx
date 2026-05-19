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
import { motion, AnimatePresence } from "framer-motion";

// Premium button animation variants
const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.08, y: -1 },
  tap: { scale: 0.92 },
};

// Icon transition animation
const iconVariants = {
  initial: { opacity: 0, rotate: -90 },
  animate: { opacity: 1, rotate: 0 },
  exit: { opacity: 0, rotate: 90 },
};

// Premium button styles
const premiumButtonClass = cn(
  "h-9 w-9 p-0 flex items-center justify-center",
  "rounded-lg",
  "bg-gradient-to-br from-background via-background to-muted/30",
  "border border-border/50",
  "shadow-sm shadow-black/5",
  "transition-all duration-300",
  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/10",
  "disabled:opacity-40 disabled:hover:shadow-none disabled:hover:border-border/50"
);

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
        "flex items-center gap-1.5",
        "ltr:flex-row rtl:flex-row-reverse"
      )}
    >
      {/* First page button */}
      <motion.div
        variants={buttonVariants}
        initial="idle"
        whileHover={canPreviousPage && !paginationLoading ? "hover" : "idle"}
        whileTap={canPreviousPage && !paginationLoading ? "tap" : "idle"}
        className="hidden lg:block"
      >
        <Button
          variant="ghost"
          className={premiumButtonClass}
          onClick={handleGotoFirst}
          disabled={!canPreviousPage || paginationLoading}
        >
          <span className="sr-only">Go to first page</span>
          <AnimatePresence mode="wait">
            {paginationLoading && clickedButton === "first" ? (
              <motion.div
                key="loading"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <ChevronsLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Previous page button */}
      <motion.div
        variants={buttonVariants}
        initial="idle"
        whileHover={canPreviousPage && !paginationLoading ? "hover" : "idle"}
        whileTap={canPreviousPage && !paginationLoading ? "tap" : "idle"}
      >
        <Button
          variant="ghost"
          className={premiumButtonClass}
          onClick={handlePrevious}
          disabled={!canPreviousPage || paginationLoading}
        >
          <span className="sr-only">Go to previous page</span>
          <AnimatePresence mode="wait">
            {paginationLoading && clickedButton === "previous" ? (
              <motion.div
                key="loading"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Next page button */}
      <motion.div
        variants={buttonVariants}
        initial="idle"
        whileHover={canNextPage && !paginationLoading ? "hover" : "idle"}
        whileTap={canNextPage && !paginationLoading ? "tap" : "idle"}
      >
        <Button
          variant="ghost"
          className={premiumButtonClass}
          onClick={handleNext}
          disabled={!canNextPage || paginationLoading}
        >
          <span className="sr-only">Go to next page</span>
          <AnimatePresence mode="wait">
            {paginationLoading && clickedButton === "next" ? (
              <motion.div
                key="loading"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Last page button */}
      <motion.div
        variants={buttonVariants}
        initial="idle"
        whileHover={canNextPage && !paginationLoading ? "hover" : "idle"}
        whileTap={canNextPage && !paginationLoading ? "tap" : "idle"}
        className="hidden lg:block"
      >
        <Button
          variant="ghost"
          className={premiumButtonClass}
          onClick={handleGotoLast}
          disabled={!canNextPage || paginationLoading}
        >
          <span className="sr-only">Go to last page</span>
          <AnimatePresence mode="wait">
            {paginationLoading && clickedButton === "last" ? (
              <motion.div
                key="loading"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <ChevronsRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>
    </div>
  );
}
