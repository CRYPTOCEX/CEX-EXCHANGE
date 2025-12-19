import React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

// Premium entrance animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
      delay: 0.1,
    },
  },
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
      delay: 0.2,
    },
  },
};

const textVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
      delay,
    },
  }),
};

interface NoAccessStateProps {
  children: React.ReactNode;
  title: string;
}

export function NoAccessState({ children, title }: NoAccessStateProps) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  // Use the title directly (already human-readable)
  const displayTitle = title || "";
  return (
    <div className="relative p-2 -m-2">
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-xs"
      >
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          <motion.div
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className="relative mx-auto w-fit"
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-destructive/20 blur-xl"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut" as const,
              }}
            />
            <AlertCircle className="h-16 w-16 text-muted-foreground relative z-10" />
          </motion.div>
          <motion.h2
            variants={textVariants}
            custom={0.3}
            initial="hidden"
            animate="visible"
            className="mt-4 text-lg font-semibold"
          >
            {tCommon("access_denied")}
          </motion.h2>
          <motion.p
            variants={textVariants}
            custom={0.4}
            initial="hidden"
            animate="visible"
            className="mt-2 text-sm text-muted-foreground"
          >
            {t("you_dont_have_permission_to_access")}{" "}
            {displayTitle}
          </motion.p>
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="pointer-events-none"
      >
        {children}
      </motion.div>
    </div>
  );
}
