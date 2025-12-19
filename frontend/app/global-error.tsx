"use client";

// Force dynamic rendering to avoid prerender issues
export const dynamic = "force-dynamic";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Note: Cannot use useTranslations here as NextIntlClientProvider is not available
  // in global error boundary. Using static text instead.
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            Something went wrong!
          </h2>
          <p style={{ marginBottom: "1.5rem", color: "#666", textAlign: "center", maxWidth: "500px" }}>
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              cursor: "pointer",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
