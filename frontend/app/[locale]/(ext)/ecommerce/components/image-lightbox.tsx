"use client";

import { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageLightbox({
  src,
  alt,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageSrc, setImageSrc] = useState(src || "/placeholder.svg");

  // Reset zoom level when lightbox opens
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
    }
  }, [isOpen]);

  // Load image properly
  useEffect(() => {
    if (isOpen && src) {
      // Use the new operator to create an Image object
      const imgLoader = new Image();
      imgLoader.crossOrigin = "anonymous";

      imgLoader.onload = () => {
        setImageSrc(src);
      };

      imgLoader.onerror = () => {
        setImageSrc("/placeholder.svg");
      };

      imgLoader.src = src;
    }
  }, [isOpen, src]);

  // Close on escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 text-white">
          <div className="text-sm opacity-75">{alt}</div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              disabled={zoomLevel <= 1}
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              disabled={zoomLevel >= 3}
            >
              <ZoomIn className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              aria-label="Close lightbox"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Image container */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div
            className="relative transition-transform duration-200 cursor-move"
            style={{
              transform: `scale(${zoomLevel})`,
              maxWidth: "90vw",
              maxHeight: "70vh",
            }}
          >
            <img
              src={imageSrc || "/placeholder.svg"}
              alt={alt}
              className="object-contain max-h-[70vh] max-w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
