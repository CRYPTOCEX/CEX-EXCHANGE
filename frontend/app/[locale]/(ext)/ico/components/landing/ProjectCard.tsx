"use client";

import { useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import {
  ArrowRight,
  Users,
  Clock,
  Flame,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";

export interface FeaturedProject {
  id: string;
  name: string;
  image: string;
  description: string;
  raised: string;
  target: string;
  progress: number;
  category?: string;
  investors?: number;
  daysLeft?: number;
}

interface ProjectCardProps {
  project: FeaturedProject;
  index: number;
  gradient: { from: string; to: string };
  variant?: "default" | "featured" | "compact";
}

export default function ProjectCard({
  project,
  index,
  gradient,
  variant = "default",
}: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const isHot = project.progress >= 75;
  const isNew = project.daysLeft !== undefined && project.daysLeft > 25;
  const isEndingSoon = project.daysLeft !== undefined && project.daysLeft <= 3;

  // Featured variant - larger card for hero position
  if (variant === "featured") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{
          duration: 0.6,
          delay: index * 0.1,
          type: "spring",
          stiffness: 100,
        }}
      >
        <Link href={`/ico/offer/${project.id}`}>
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ y: -8 }}
            style={{
              rotateX,
              rotateY,
              transformPerspective: 1200,
              transformStyle: "preserve-3d",
            }}
            className="relative group cursor-pointer h-full select-none"
          >
            {/* Glow effect */}
            <motion.div
              className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
              style={{
                background: `linear-gradient(135deg, ${gradient.from}40, ${gradient.to}40)`,
              }}
            />

            {/* Card */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200/50 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 h-full">
              {/* Background gradient */}
              <div
                className="absolute inset-0 opacity-5 dark:opacity-10"
                style={{
                  background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                }}
              />

              <div className="flex flex-col lg:flex-row">
                {/* Image */}
                <div className="relative w-full lg:w-1/2 h-64 lg:h-auto overflow-hidden">
                  <Image
                    src={project.image || "/img/placeholder.svg"}
                    alt={project.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-linear-to-t lg:bg-linear-to-r from-black/60 via-black/20 to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    {isHot && (
                      <Badge className="bg-linear-to-r from-orange-500 to-red-500 text-white border-0 px-3 py-1 text-xs font-semibold shadow-lg">
                        <Flame className="w-3 h-3 mr-1" />
                        Hot
                      </Badge>
                    )}
                    {isNew && (
                      <Badge className="bg-linear-to-r from-teal-500 to-cyan-500 text-white border-0 px-3 py-1 text-xs font-semibold shadow-lg">
                        <Zap className="w-3 h-3 mr-1" />
                        New
                      </Badge>
                    )}
                    {isEndingSoon && (
                      <Badge className="bg-linear-to-r from-amber-500 to-yellow-500 text-white border-0 px-3 py-1 text-xs font-semibold shadow-lg">
                        <Clock className="w-3 h-3 mr-1" />
                        Ending Soon
                      </Badge>
                    )}
                  </div>

                  {/* Category */}
                  {project.category && (
                    <Badge
                      variant="outline"
                      className="absolute bottom-4 left-4 bg-white/10 backdrop-blur-md border-white/30 text-white text-xs font-medium"
                    >
                      {project.category}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-6 lg:p-8 flex flex-col">
                  {/* Header */}
                  <div className="mb-4">
                    <h3
                      className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text transition-all duration-300"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                      }}
                    >
                      {project.name}
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <Target
                        className="w-4 h-4 mx-auto mb-1"
                        style={{ color: gradient.from }}
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Target
                      </p>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {project.target}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <TrendingUp
                        className="w-4 h-4 mx-auto mb-1"
                        style={{ color: gradient.from }}
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Raised
                      </p>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {project.raised}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <Users
                        className="w-4 h-4 mx-auto mb-1"
                        style={{ color: gradient.from }}
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Investors
                      </p>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {project.investors || 0}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span
                        className="font-semibold"
                        style={{ color: gradient.from }}
                      >
                        {project.progress}% Funded
                      </span>
                      {project.daysLeft !== undefined && (
                        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {project.daysLeft} days left
                        </span>
                      )}
                    </div>
                    <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full relative"
                        style={{
                          background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
                        }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${project.progress}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      >
                        <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
                      </motion.div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-auto">
                    <div
                      className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 group-hover:shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                        boxShadow: `0 4px 20px ${gradient.from}30`,
                      }}
                    >
                      View Project
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    );
  }

  // Compact variant - smaller cards for grid
  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{
          duration: 0.5,
          delay: index * 0.1,
          type: "spring",
          stiffness: 120,
        }}
      >
        <Link href={`/ico/offer/${project.id}`}>
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ y: -4, scale: 1.02 }}
            style={{
              rotateX,
              rotateY,
              transformPerspective: 1000,
              transformStyle: "preserve-3d",
            }}
            className="relative group cursor-pointer h-full select-none"
          >
            {/* Glow */}
            <motion.div
              className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"
              style={{
                background: `linear-gradient(135deg, ${gradient.from}30, ${gradient.to}30)`,
              }}
            />

            {/* Card */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 h-full p-4">
              <div className="flex items-center gap-4">
                {/* Image */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={project.image || "/img/placeholder.svg"}
                    alt={project.name}
                    fill
                    sizes="64px"
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  {isHot && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/40"
                      style={{
                        background: `linear-gradient(135deg, ${gradient.from}80, ${gradient.to}80)`,
                      }}
                    >
                      <Flame className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-zinc-900 dark:text-white text-sm truncate mb-1">
                    {project.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span
                      style={{ color: gradient.from }}
                      className="font-semibold"
                    >
                      {project.progress}%
                    </span>
                    <span>•</span>
                    <span>{project.raised}</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
                        width: `${project.progress}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-all group-hover:translate-x-1 shrink-0" />
              </div>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.12,
        type: "spring",
        stiffness: 100,
      }}
    >
      <Link href={`/ico/offer/${project.id}`}>
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ y: -6 }}
          style={{
            rotateX,
            rotateY,
            transformPerspective: 1200,
            transformStyle: "preserve-3d",
          }}
          className="relative group cursor-pointer h-full select-none"
        >
          {/* Glow effect */}
          <motion.div
            className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg"
            style={{
              background: `linear-gradient(135deg, ${gradient.from}35, ${gradient.to}35)`,
            }}
          />

          {/* Card */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 h-full">
            {/* Image */}
            <div className="relative h-44 overflow-hidden">
              <Image
                src={project.image || "/img/placeholder.svg"}
                alt={project.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                {isHot && (
                  <Badge className="bg-linear-to-r from-orange-500 to-red-500 text-white border-0 px-2.5 py-0.5 text-xs font-semibold">
                    <Flame className="w-3 h-3 mr-1" />
                    Hot
                  </Badge>
                )}
                {isNew && (
                  <Badge className="bg-linear-to-r from-teal-500 to-cyan-500 text-white border-0 px-2.5 py-0.5 text-xs font-semibold">
                    <Zap className="w-3 h-3 mr-1" />
                    New
                  </Badge>
                )}
              </div>

              {/* Category */}
              {project.category && (
                <Badge
                  variant="outline"
                  className="absolute top-3 right-3 bg-white/10 backdrop-blur-md border-white/30 text-white text-xs"
                >
                  {project.category}
                </Badge>
              )}

              {/* Bottom info on image */}
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                  {project.name}
                </h3>
                <p className="text-white/70 text-xs line-clamp-1">
                  {project.description}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Funding info */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Raised
                  </p>
                  <p className="text-base font-bold text-zinc-900 dark:text-white">
                    {project.raised}
                    <span className="text-xs text-zinc-400 font-normal ml-1">
                      / {project.target}
                    </span>
                  </p>
                </div>
                <div
                  className="text-right px-3 py-1.5 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)`,
                  }}
                >
                  <p
                    className="text-lg font-bold"
                    style={{ color: gradient.from }}
                  >
                    {project.progress}%
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full rounded-full relative"
                  style={{
                    background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
                  }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${project.progress}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-linear-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
                </motion.div>
              </div>

              {/* Footer stats */}
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-3">
                  {project.investors !== undefined && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {project.investors}
                    </span>
                  )}
                  {project.daysLeft !== undefined && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {project.daysLeft}d left
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 font-medium text-zinc-600 dark:text-zinc-300 group-hover:translate-x-0.5 transition-transform">
                  View
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
