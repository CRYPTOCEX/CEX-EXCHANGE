"use client";

import React, { memo, useMemo } from "react";
import type { Element } from "@/types/builder";
import { cn } from "@/lib/utils";

interface ImageSettings {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  aspectRatio?: string;
  border?: boolean;
  borderWidth?: number;
  borderColor?: string;
  shadow?: string;
  opacity?: number;
  filter?: string;
}

interface ImageElementProps {
  element: Element;
  onTextChange?: (e: React.FormEvent<HTMLDivElement>) => void;
  isEditMode?: boolean;
}

// Main image element component
export const ImageElementComponent = memo<ImageElementProps>(
  ({ element }) => {
    const settings = (element.settings || {}) as ImageSettings;

    const {
      src = "/placeholder-image.jpg",
      alt = "Image",
      width,
      height,
      borderRadius = 0,
      objectFit = "cover",
      aspectRatio,
      border = false,
      borderWidth = 1,
      borderColor = "#e2e8f0",
      shadow = "none",
      opacity = 1,
      filter = "none",
    } = settings;

    const imageStyles = useMemo(
      (): React.CSSProperties => ({
        width: width ? `${width}px` : "100%",
        height: height ? `${height}px` : "auto",
        borderRadius: `${borderRadius}px`,
        objectFit: objectFit as React.CSSProperties["objectFit"],
        aspectRatio: aspectRatio || undefined,
        border: border ? `${borderWidth}px solid ${borderColor}` : "none",
        boxShadow: shadow !== "none" ? shadow : undefined,
        opacity,
        filter: filter !== "none" ? filter : undefined,
        transition: "all 0.2s ease-in-out",
      }),
      [
        width,
        height,
        borderRadius,
        objectFit,
        aspectRatio,
        border,
        borderWidth,
        borderColor,
        shadow,
        opacity,
        filter,
      ]
    );

    const containerClasses = useMemo(
      () =>
        cn(
          "image-element-container",
          "overflow-hidden"
        ),
      []
    );

    return (
      <div
        className={containerClasses}
        data-element-id={element.id}
        data-element-type="image"
      >
        <img
          src={src}
          alt={alt}
          className="block max-w-full h-auto"
          style={imageStyles}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder-image.jpg";
          }}
        />
      </div>
    );
  }
);

ImageElementComponent.displayName = "ImageElement";

// Gallery element component
export const GalleryElementComponent = memo<ImageElementProps>(
  ({ element, onTextChange, isEditMode }) => {
    const settings = element.settings || {};
    const images = settings.images || [
      { src: "/placeholder-image.jpg", alt: "Gallery Image 1" },
      { src: "/placeholder-image.jpg", alt: "Gallery Image 2" },
      { src: "/placeholder-image.jpg", alt: "Gallery Image 3" },
    ];

    const columns = settings.columns || 3;
    const gap = settings.gap || 16;
    const borderRadius = settings.borderRadius || 8;

    const galleryStyles = useMemo(
      (): React.CSSProperties => ({
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }),
      [columns, gap]
    );

    const imageStyles = useMemo(
      (): React.CSSProperties => ({
        width: "100%",
        height: "200px",
        objectFit: "cover" as React.CSSProperties["objectFit"],
        borderRadius: `${borderRadius}px`,
        transition: "transform 0.2s ease-in-out",
      }),
      [borderRadius]
    );

    return (
      <div
        className="gallery-element"
        style={galleryStyles}
        data-element-id={element.id}
        data-element-type="gallery"
      >
        {images.map((image: any, index: number) => (
          <div key={index} className="gallery-item overflow-hidden">
            <img
              src={image.src}
              alt={image.alt || `Gallery Image ${index + 1}`}
              style={imageStyles}
              className="hover:scale-105 transition-transform duration-200"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder-image.jpg";
              }}
            />
          </div>
        ))}
      </div>
    );
  }
);

GalleryElementComponent.displayName = "GalleryElement";
