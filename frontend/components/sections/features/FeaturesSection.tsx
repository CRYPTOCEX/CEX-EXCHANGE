"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { FeaturesSectionProps, FeaturesPreset, featuresPresets } from "./types";
import { SectionBackground, SectionHeader } from "../shared";
import { paddingClasses, gapClasses, getColor } from "../shared/types";
import FeatureCard from "./FeatureCard";

interface FeaturesSectionComponentProps extends FeaturesSectionProps {
  preset?: FeaturesPreset;
}

const columnsClasses = {
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

export default function FeaturesSection({
  header,
  features,
  layout,
  background,
  animation = { enabled: true },
  theme = { primary: "teal", secondary: "cyan" },
  showCTA,
  cta,
  className = "",
  preset,
  id,
}: FeaturesSectionComponentProps) {
  // Apply preset if provided
  const presetConfig = preset ? featuresPresets[preset] : null;
  const finalLayout = { ...presetConfig?.layout, ...layout };

  const { variant = "grid", columns = 3, gap = "lg" } = finalLayout;

  const primaryColor = getColor(theme.primary || "teal");

  // Bento grid layout
  const renderBentoGrid = () => {
    // Create a 6-column bento layout
    const bentoPositions = [
      "col-span-2 row-span-2", // Large featured
      "col-span-2 row-span-1", // Wide
      "col-span-2 row-span-1", // Wide
      "col-span-1 row-span-1", // Small
      "col-span-1 row-span-1", // Small
      "col-span-2 row-span-1", // Wide
      "col-span-1 row-span-1", // Small
      "col-span-1 row-span-1", // Small
    ];

    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 ${gapClasses[gap]}`}>
        {features.map((feature, index) => (
          <div key={feature.id || index} className={bentoPositions[index % bentoPositions.length]}>
            <FeatureCard
              feature={feature}
              layout={finalLayout}
              theme={theme}
              index={index}
              animate={animation.enabled}
            />
          </div>
        ))}
      </div>
    );
  };

  // List layout
  const renderList = () => {
    return (
      <div className={`flex flex-col ${gapClasses[gap]} max-w-4xl mx-auto`}>
        {features.map((feature, index) => (
          <FeatureCard
            key={feature.id || index}
            feature={feature}
            layout={{ ...finalLayout, iconPosition: "left" }}
            theme={theme}
            index={index}
            animate={animation.enabled}
          />
        ))}
      </div>
    );
  };

  // Detailed list layout with alternating sides
  const renderListDetailed = () => {
    return (
      <div className={`flex flex-col ${gapClasses[gap]}`}>
        {features.map((feature, index) => {
          const isEven = index % 2 === 0;
          return (
            <motion.div
              key={feature.id || index}
              initial={{ opacity: 0, x: isEven ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`flex flex-col lg:flex-row items-center gap-8 ${
                isEven ? "" : "lg:flex-row-reverse"
              }`}
            >
              {/* Image/Visual */}
              <div className="flex-1 w-full">
                {feature.image ? (
                  <div className="rounded-2xl overflow-hidden shadow-xl">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-64 lg:h-80 object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-full h-64 lg:h-80 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}10, ${primaryColor}05)`,
                    }}
                  >
                    {feature.icon && (
                      <feature.icon
                        className="w-24 h-24"
                        style={{ color: `${primaryColor}40` }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 ${isEven ? "lg:pl-8" : "lg:pr-8"}`}>
                {feature.badge && (
                  <span
                    className="inline-flex px-3 py-1 text-sm font-medium rounded-full mb-4"
                    style={{
                      background: `${primaryColor}15`,
                      color: primaryColor,
                    }}
                  >
                    {feature.badge}
                  </span>
                )}
                <h3 className="text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed mb-6">
                  {feature.description}
                </p>
                {feature.link && (
                  <Link
                    href={feature.link.href}
                    className="inline-flex items-center gap-2 font-medium transition-colors"
                    style={{ color: primaryColor }}
                  >
                    {feature.link.text}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Icon boxes (compact icon-focused layout)
  const renderIconBoxes = () => {
    return (
      <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]}`}>
        {features.map((feature, index) => (
          <motion.div
            key={feature.id || index}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="group text-center p-6 rounded-2xl bg-white dark:bg-zinc-900 hover:shadow-lg transition-all duration-300"
          >
            {feature.icon && (
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)`,
                  boxShadow: `0 0 0 0 ${primaryColor}40`,
                }}
              >
                <feature.icon className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
            )}
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">{feature.title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    );
  };

  // Default grid layout
  const renderGrid = () => {
    return (
      <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]}`}>
        {features.map((feature, index) => (
          <FeatureCard
            key={feature.id || index}
            feature={feature}
            layout={finalLayout}
            theme={theme}
            index={index}
            animate={animation.enabled}
          />
        ))}
      </div>
    );
  };

  // Render based on variant
  const renderFeatures = () => {
    switch (variant) {
      case "bento":
        return renderBentoGrid();
      case "list":
        return renderList();
      case "list-detailed":
        return renderListDetailed();
      case "icon-boxes":
        return renderIconBoxes();
      case "grid":
      case "grid-alternating":
      case "cards":
      case "cards-hover":
      case "minimal":
      default:
        return renderGrid();
    }
  };

  return (
    <section
      id={id}
      className={`relative ${paddingClasses.lg} overflow-hidden ${className}`}
    >
      {/* Background */}
      {background && <SectionBackground config={background} theme={theme} />}

      {/* Content */}
      <div className="container mx-auto relative z-10">
        {/* Header */}
        {header && <SectionHeader config={header} theme={theme} animate={animation.enabled} />}

        {/* Features */}
        {renderFeatures()}

        {/* CTA */}
        {showCTA && cta && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <Link
              href={cta.href}
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium transition-all duration-300 ${
                cta.variant === "outline"
                  ? "border-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  : cta.variant === "secondary"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    : "text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              }`}
              style={
                cta.variant === "outline"
                  ? { borderColor: primaryColor, color: primaryColor }
                  : cta.variant !== "secondary"
                    ? { backgroundColor: primaryColor }
                    : {}
              }
            >
              {cta.text}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
