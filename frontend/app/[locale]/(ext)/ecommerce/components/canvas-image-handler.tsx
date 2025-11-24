"use client";

import { useEffect, useRef } from "react";

interface CanvasImageHandlerProps {
  src: string;
  width: number;
  height: number;
}

export default function CanvasImageHandler({
  src,
  width,
  height,
}: CanvasImageHandlerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create a new Image with the 'new' operator
    const img = new Image();

    // Set crossOrigin to avoid CORS issues
    img.crossOrigin = "anonymous";

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
    };

    img.src = src;
  }, [src, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}
