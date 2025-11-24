"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Star } from "lucide-react";
import { useAnimateOnScroll } from "../../hooks/use-animate-on-scroll";
import { useTranslations } from "next-intl";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemFadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function TestimonialsSection() {
  const t = useTranslations("ext");
  const testimonialsSection = useAnimateOnScroll();

  return (
    <motion.div
      className="bg-white dark:bg-zinc-950 py-20"
      ref={testimonialsSection.ref}
      initial="hidden"
      animate={testimonialsSection.controls}
      variants={testimonialsSection.variants}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          variants={itemFadeIn}
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 sm:text-4xl">
            {t("what_our_customers_say")}
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-zinc-400">
            {t("real_experiences_from_our_community")}
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <TestimonialCard
            name="Sarah Johnson"
            image="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1587&q=80"
            rating={5}
            testimonial="I love being able to pay with Bitcoin for my purchases. The process was smooth and the delivery was faster than expected. Highly recommend!"
          />

          <TestimonialCard
            name="Michael Chen"
            image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1587&q=80"
            rating={4}
            testimonial="The digital products I purchased were instantly available after payment. The quality exceeded my expectations. Will definitely shop here again."
          />

          <TestimonialCard
            name="Emily Rodriguez"
            image="https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1061&q=80"
            rating={5}
            testimonial="Customer service was exceptional when I had questions about my order. The team was responsive and helpful. The product arrived in perfect condition."
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

interface TestimonialCardProps {
  name: string;
  image: string;
  rating: number;
  testimonial: string;
}

function TestimonialCard({
  name,
  image,
  rating,
  testimonial,
}: TestimonialCardProps) {
  return (
    <motion.div
      className="bg-white dark:bg-zinc-900/80 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-zinc-700"
      variants={itemFadeIn}
      whileHover={{
        y: -10,
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}
    >
      <div className="flex items-center mb-6">
        <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-700 flex-shrink-0">
          <Image
            src={image || "/placeholder.svg"}
            alt={name}
            width={48}
            height={48}
            className="object-cover"
          />
        </div>
        <div className="ml-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
            {name}
          </h4>
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 dark:text-zinc-600"}`}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-gray-600 dark:text-zinc-300 italic">{testimonial}</p>
    </motion.div>
  );
}
