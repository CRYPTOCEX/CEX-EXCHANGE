"use client";

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ImageIcon, AlertCircle } from 'lucide-react';

interface OptimizedNFTImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  fallbackSrc?: string;
  showLoadingState?: boolean;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  quality?: number;
}

export const OptimizedNFTImage = ({ 
  src, 
  alt, 
  width = 400, 
  height = 400,
  priority = false,
  className,
  fallbackSrc,
  showLoadingState = true,
  aspectRatio = 'square',
  quality = 85
}: OptimizedNFTImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    
    // Try fallback image if provided
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
    }
  }, [fallbackSrc, currentSrc]);

  // Calculate dimensions based on aspect ratio
  const getDimensions = () => {
    switch (aspectRatio) {
      case 'portrait':
        return { width, height: Math.round(width * 1.4) };
      case 'landscape':
        return { width, height: Math.round(width * 0.7) };
      default:
        return { width, height };
    }
  };

  const dimensions = getDimensions();

  // Generate srcSet for responsive images
  const generateSrcSet = (originalSrc: string) => {
    // For IPFS or external URLs, we'll just use the original
    if (originalSrc.startsWith('ipfs://') || originalSrc.startsWith('http')) {
      return originalSrc;
    }
    
    // For local images, generate multiple sizes
    const sizes = [320, 640, 768, 1024, 1280];
    return sizes
      .map(size => `${originalSrc}?w=${size}&q=${quality} ${size}w`)
      .join(', ');
  };

  if (hasError) {
    return (
      <div 
        className={cn(
          "flex flex-col items-center justify-center bg-muted border border-border rounded-lg",
          className
        )}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
        <span className="text-sm text-muted-foreground text-center px-2">
          Failed to load image
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn("relative overflow-hidden rounded-lg", className)}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {/* Loading state */}
      {isLoading && showLoadingState && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted animate-pulse">
          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      )}

      {/* Optimized Image */}
      <Image
        src={currentSrc}
        alt={alt}
        width={dimensions.width}
        height={dimensions.height}
        priority={priority}
        quality={quality}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        sizes={`
          (max-width: 768px) 100vw, 
          (max-width: 1200px) 50vw, 
          33vw
        `}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        // IPFS Gateway optimization
        loader={({ src, width, quality }) => {
          // Handle IPFS URLs
          if (src.startsWith('ipfs://')) {
            const ipfsHash = src.replace('ipfs://', '');
            return `https://ipfs.io/ipfs/${ipfsHash}?w=${width}&q=${quality || 75}`;
          }
          
          // Handle regular URLs with optimization params
          if (src.includes('?')) {
            return `${src}&w=${width}&q=${quality || 75}`;
          }
          
          return `${src}?w=${width}&q=${quality || 75}`;
        }}
      />

      {/* Overlay for additional info */}
      {!isLoading && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200" />
      )}
    </div>
  );
};

// Specialized components for different NFT image use cases
export const NFTThumbnail = ({ src, alt, ...props }: Omit<OptimizedNFTImageProps, 'width' | 'height'>) => (
  <OptimizedNFTImage
    src={src}
    alt={alt}
    width={120}
    height={120}
    quality={60}
    aspectRatio="square"
    {...props}
  />
);

export const NFTCardImage = ({ src, alt, fallbackSrc = "/img/nft/placeholder.svg", ...props }: Omit<OptimizedNFTImageProps, 'width' | 'height'>) => (
  <OptimizedNFTImage
    src={src}
    alt={alt}
    width={280}
    height={280}
    quality={75}
    aspectRatio="square"
    fallbackSrc={fallbackSrc}
    {...props}
  />
);

export const NFTHeroImage = ({ src, alt, ...props }: Omit<OptimizedNFTImageProps, 'width' | 'height' | 'priority'>) => (
  <OptimizedNFTImage
    src={src}
    alt={alt}
    width={600}
    height={600}
    quality={90}
    priority={true}
    aspectRatio="square"
    {...props}
  />
);

export const NFTListingImage = ({ src, alt, ...props }: Omit<OptimizedNFTImageProps, 'width' | 'height'>) => (
  <OptimizedNFTImage
    src={src}
    alt={alt}
    width={200}
    height={200}
    quality={70}
    aspectRatio="square"
    {...props}
  />
);