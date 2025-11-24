import { Button } from "@/components/ui/button";
import { Minimize } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect } from "react";

interface FullScreenImageViewerProps {
  src: string;
  onClose: () => void;
}

export const FullScreenImageViewer = ({
  src,
  onClose,
}: FullScreenImageViewerProps) => {
  // Add keyboard event listener for ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 no-print"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white z-10"
          onClick={onClose}
        >
          <Minimize className="h-5 w-5" />
        </Button>
        <img
          src={src || "/placeholder.svg"}
          alt="Full screen view"
          className="w-full h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
      </div>
    </motion.div>
  );
};
