"use client";
import { m } from "framer-motion";
export const LayoutWrapper = ({
  children,
  location,
}: {
  children: React.ReactNode;
  location?: string;
}) => {
  return (
      <m.div
        key={location}
        initial="pageInitial"
        animate="pageAnimate"
        exit="pageExit"
        variants={{
          pageInitial: {
            opacity: 0,
            y: 50,
          },
          pageAnimate: {
            opacity: 1,
            y: 0,
          },
          pageExit: {
            opacity: 0,
            y: -50,
          },
        }}
        transition={{
          type: "tween",
          ease: "easeOut",
          duration: 0.2,
        }}
      >
        <main>{children}</main>
      </m.div>
  );
};
