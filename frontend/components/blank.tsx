import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface BlankProps {
  children: React.ReactNode;
  img?: React.ReactNode;
  className?: string;
}
const Blank = ({
  children,
  img = (
    <Image src="/img/svg/man-vector.svg" alt="Blank" width={240} height={240} />
  ),
  className,
}: BlankProps) => {
  return (
    <div className={cn("text-center", className)}>
      {img && <div className="mx-auto">{img}</div>}
      {children}
    </div>
  );
};

export default Blank;
