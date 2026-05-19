"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface CategoryCardProps {
  category: ecommerceCategoryAttributes;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Link
        key={category.id}
        href={`/ecommerce/category/${category.slug}`}
        className="group"
      >
        <div className={`relative h-80 rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-amber-500/30 transition-all duration-300 shadow-lg group-hover:shadow-2xl group-hover:shadow-amber-500/20`}>
          <Image
            src={category.image || "/placeholder.svg"}
            alt={category.name}
            fill
            className="object-cover transform group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-zinc-900/95 via-zinc-900/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h3 className="text-2xl font-bold text-white mb-2">
              {category.name}
            </h3>
            <p className="text-white/90 mb-4">{category.description}</p>
            <div className={`inline-flex items-center text-emerald-500 group-hover:text-white transition-colors font-semibold`}>
              Browse {category.name}{" "}
              <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
