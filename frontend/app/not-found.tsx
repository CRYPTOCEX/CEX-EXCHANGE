// Root not-found page for handling 404s outside of locale routes
// Force dynamic rendering to avoid prerender issues
export const dynamic = "force-dynamic";

export default function NotFound() {
  // Note: Cannot use getTranslations here as this is outside the locale routing structure
  // Using static text instead.
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
          <h1 style={{ fontSize: "6rem", margin: 0 }}>404</h1>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            Page Not Found
          </h2>
          <p style={{ color: "#666", marginBottom: "2rem", textAlign: "center", maxWidth: "500px" }}>
            The page you are looking for does not exist or has been moved.
          </p>
          <a
            href="/"
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              textDecoration: "none",
              backgroundColor: "#0070f3",
              color: "white",
              borderRadius: "4px",
            }}
          >
            Go Home
          </a>
        </div>
      </body>
    </html>
  );
}
