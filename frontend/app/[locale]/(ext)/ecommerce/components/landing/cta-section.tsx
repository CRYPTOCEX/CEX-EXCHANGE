"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useAnimateOnScroll } from "../../hooks/use-animate-on-scroll";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

const itemFadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function CTASection() {
  const t = useTranslations("ext");
  const ctaSection = useAnimateOnScroll();
  const { user } = useUserStore();

  return (
    <motion.div
      className="relative bg-indigo-700 py-16 overflow-hidden"
      ref={ctaSection.ref}
      initial="hidden"
      animate={ctaSection.controls}
      variants={ctaSection.variants}
    >
      <motion.div
        className="absolute inset-0 overflow-hidden opacity-20"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 20,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
      >
        <svg
          className="absolute left-0 top-0 h-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1000 1000"
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 40L40 0M0 0L40 40"
                stroke="white"
                strokeWidth="1"
                fill="none"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </motion.div>
      <motion.div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        variants={itemFadeIn}
      >
        <motion.h2
          className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {user
            ? "Ready to shop premium products?"
            : "Join our premium marketplace"}
        </motion.h2>
        <motion.p
          className="mt-4 text-lg text-indigo-100 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {user
            ? "Discover carefully curated products and exclusive digital content with secure payment options."
            : "Create your account to access our marketplace featuring quality products, secure payments, and instant digital downloads."}
        </motion.p>
        <motion.div
          className="mt-8 flex justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          {user ? (
            <div className="flex gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/ecommerce"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-gray-50 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-indigo-700"
                >
                  {t("browse_products")}
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/ecommerce/order"
                  className="inline-flex items-center justify-center px-6 py-3 border border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-white hover:text-indigo-700 transition-colors"
                >
                  {t("your_orders")}
                </Link>
              </motion.div>
            </div>
          ) : (
            <div className="inline-flex rounded-md shadow">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-gray-50 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-indigo-700"
                >
                  {t("get_started")}
                </Link>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
