"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface LoadingSectionProps {
  title?: string;
  description?: string;
}

export default function LoadingSection({ title, description }: LoadingSectionProps) {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-primary" />
          </motion.div>
          {title && (
            <h3 className="text-xl font-semibold text-center">{title}</h3>
          )}
          {description && (
            <p className="text-muted-foreground text-center max-w-md">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
