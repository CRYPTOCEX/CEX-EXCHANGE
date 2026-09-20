// Helper function to get SVG path for field type icons
export const getIconPath = (type: string): string => {
  switch (type) {
    case "TEXT":
      return "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"; // Type icon
    case "TEXTAREA":
      return "M4 6h16M4 12h16M4 18h7"; // AlignLeft icon
    case "SELECT":
      return "M8 9l4-4 4 4m0 6l-4 4-4-4"; // ChevronUpDown icon
    case "CHECKBOX":
      return "M9 11l3 3L22 4"; // Check icon
    case "RADIO":
      return "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"; // Circle icon
    case "DATE":
      return "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"; // Calendar icon
    case "FILE":
      return "M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"; // Upload icon
    case "NUMBER":
      return "M7 20l4-16m2 16l4-16"; // Hash icon
    case "EMAIL":
      return "M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"; // Mail icon
    case "PHONE":
      return "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"; // Phone icon
    case "ADDRESS":
      return "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"; // MapPin icon
    case "IDENTITY":
      return "M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z"; // IdentificationCard icon
    default:
      return "M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"; // Default icon
  }
};

// The three per-category colour helpers that used to live here are gone; the
// library card now takes FIELD_TONE from ../field-tokens. Two of the five
// categories already resolved to the same value, and the other two were wearing
// status tokens — a date field is not a warning (DESIGN-SYSTEM.md R2). The
// panel groups these cards under headed category sections anyway, so the rail
// and the icon tile were repeating a label that is already on screen.
