import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  const style = {
    width: width
      ? typeof width === "number"
        ? `${width}px`
        : width
      : undefined,
    height: height
      ? typeof height === "number"
        ? `${height}px`
        : height
      : undefined,
  };

  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted-foreground/10 dark:bg-zinc-800",
        className
      )}
      style={style}
    />
  );
}
