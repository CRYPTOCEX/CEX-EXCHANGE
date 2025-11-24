import type React from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="pt-8 pb-20 container">{children}</div>;
}
