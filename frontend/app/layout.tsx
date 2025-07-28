import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loading...",
  description: "Redirecting to localized version",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
} 