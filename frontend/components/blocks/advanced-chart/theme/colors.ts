/**
 * Chart Theme Colors
 *
 * This file contains all the colors used in the chart components.
 * Centralizing colors makes it easier to maintain consistency and update themes.
 */

// Define the color themes
export const chartColors = {
  // Dark theme colors
  dark: {
    // Background colors
    background: {
      primary: "#000000",
      secondary: "#0A0A0A",
      tertiary: "#121212",
      panel: "#000000",
      tooltip: "#000000",
      overlay: "rgba(0, 0, 0, 0.9)",
      volumePanel: "#0A0A0A",
      indicatorPanel: "#000000",
      settingsPanel: "rgba(0, 0, 0, 0.9)",
      popover: "rgba(0, 0, 0, 0.95)",
      modal: "#000000",
      headerGradient:
        "linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 100%)",
    },

    // Text colors
    text: {
      primary: "rgba(255, 255, 255, 0.9)",
      secondary: "rgba(212, 212, 216, 0.7)",
      tertiary: "rgba(161, 161, 170, 0.5)",
      label: "rgba(212, 212, 216, 0.7)",
      value: "#ffffff",
      positive: "#22c55e", // Updated to match orderbook
      negative: "#ef4444", // Updated to match orderbook
    },

    // Border colors
    border: {
      primary: "rgba(161, 161, 170, 0.2)",
      secondary: "rgba(161, 161, 170, 0.1)",
      panel: "#27272A",
      popover: "#27272A",
      modal: "#27272A",
      active: "#3b82f6",
    },

    // Grid colors
    grid: {
      primary: "rgba(161, 161, 170, 0.07)",
      secondary: "rgba(161, 161, 170, 0.05)",
      horizontal: "rgba(161, 161, 170, 0.07)",
      vertical: "rgba(161, 161, 170, 0.07)",
    },

    // Axis colors
    axis: {
      price: {
        text: "rgba(212, 212, 216, 0.7)",
        line: "rgba(161, 161, 170, 0.3)",
        tick: "rgba(161, 161, 170, 0.3)",
        background: "#121212", // Updated from #000000 to a dark gray
      },
      time: {
        text: "rgba(212, 212, 216, 0.7)",
        line: "rgba(161, 161, 170, 0.1)",
        tick: "rgba(161, 161, 170, 0.3)",
        background: "#121212", // Updated from #000000 to a dark gray
      },
    },

    // Candle colors
    candle: {
      bullish: {
        body: "#22c55e", // Updated to match orderbook green
        border: "#22c55e", // Updated to match orderbook green
        wick: "#22c55e", // Updated to match orderbook green
      },
      bearish: {
        body: "#ef4444", // Updated to match orderbook red
        border: "#ef4444", // Updated to match orderbook red
        wick: "#ef4444", // Updated to match orderbook red
      },
      doji: {
        body: "#787b86",
        border: "#787b86",
        wick: "#787b86",
      },
    },

    // Volume colors
    volume: {
      bullish: "rgba(34, 197, 94, 0.5)", // Updated to match orderbook green
      bearish: "rgba(239, 68, 68, 0.5)", // Updated to match orderbook red
    },

    // Line chart colors
    line: {
      primary: "#3b82f6",
      secondary: "#22c55e", // Updated to match orderbook green
    },

    // Area chart colors
    area: {
      line: "#3b82f6",
      fill: "rgba(59, 130, 246, 0.1)",
      gradient: {
        top: "rgba(59, 130, 246, 0.2)",
        bottom: "rgba(59, 130, 246, 0.02)",
      },
    },

    // Crosshair colors
    crosshair: {
      line: "rgba(212, 212, 216, 0.5)",
      label: {
        background: "#2A2E39",
        text: "#22c55e", // Updated to match orderbook green
      },
    },

    // Price line colors
    priceLine: {
      bullish: "#22c55e", // Updated to match orderbook green
      bearish: "#ef4444", // Updated to match orderbook red
      neutral: "#787b86",
      label: {
        text: "#ffffff",
      },
    },

    // Indicator colors
    indicator: {
      panel: {
        background: "rgba(0, 0, 0, 0.7)",
        header: "rgba(0, 0, 0, 0.8)",
        border: "rgba(39, 39, 42, 0.6)",
      },
      rsi: {
        line: "#f59e0b",
        overbought: "rgba(239, 68, 68, 0.3)", // Updated to match orderbook red
        oversold: "rgba(34, 197, 94, 0.3)", // Updated to match orderbook green
        middle: "rgba(212, 212, 216, 0.2)",
      },
      macd: {
        line: "#3b82f6",
        signal: "#ef4444", // Updated to match orderbook red
        histogram: {
          positive: "rgba(34, 197, 94, 0.6)", // Updated to match orderbook green
          negative: "rgba(239, 68, 68, 0.6)", // Updated to match orderbook red
        },
      },
    },

    // Expiry marker colors
    expiryMarker: {
      line: {
        normal: "rgba(245, 158, 11, 0.8)",
        expiringSoon: "rgba(239, 68, 68, 0.7)", // Updated to match orderbook red
      },
      gradient: {
        top: "rgba(245, 158, 11, 0.1)",
        middle: "rgba(245, 158, 11, 0.8)",
        bottom: "rgba(245, 158, 11, 0.1)",
      },
      countdown: {
        background: "rgba(245, 158, 11, 0.85)",
        expiringSoon: "rgba(239, 68, 68, 0.85)", // Updated to match orderbook red
        text: "#ffffff",
      },
    },

    // Position marker colors
    positionMarker: {
      call: {
        primary: "#22c55e", // Updated to match orderbook green
        secondary: "#34d399", // Lighter green
        accent: "#10b981", // Darker green
      },
      put: {
        primary: "#ef4444", // Updated to match orderbook red
        secondary: "#f87171", // Lighter red
        accent: "#dc2626", // Darker red
      },
      result: {
        win: "#22c55e", // Updated to match orderbook green
        loss: "#ef4444", // Updated to match orderbook red
      },
    },

    // UI element colors
    ui: {
      button: {
        primary: {
          background: "#3b82f6",
          hover: "#2563eb",
          text: "#ffffff",
        },
        secondary: {
          background: "#2A2E39",
          hover: "#3A3E49",
          text: "#ffffff",
        },
        success: {
          background: "#22c55e", // Updated to match orderbook green
          hover: "#16a34a", // Darker green for hover
          text: "#ffffff",
        },
        danger: {
          background: "#ef4444", // Updated to match orderbook red
          hover: "#dc2626", // Darker red for hover
          text: "#ffffff",
        },
      },
      toggle: {
        active: "#22c55e", // Updated to match orderbook green
        inactive: "#3A3E49",
        background: "rgba(0, 0, 0, 0.5)",
      },
      dropdown: {
        background: "#1A1D29",
        border: "#2A2E39",
        hover: "#2A2E39",
        text: "#ffffff",
      },
      tooltip: {
        background: "#1A1D29",
        border: "#2A2E39",
        text: "#ffffff",
      },
    },
    popover: {
      background: "rgba(0, 0, 0, 0.95)",
      backgroundAlternate: "#0F0F0F",
      border: "#27272A",
      shadow:
        "0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.6)",
      text: {
        primary: "#FFFFFF",
        secondary: "#A1A1AA",
        tertiary: "#71717A",
      },
      item: {
        hover: "#27272A",
        active: "#3F3F46",
        text: "#FFFFFF",
        textHover: "#FFFFFF",
        textActive: "#FFFFFF",
      },
      header: {
        background: "#0A0A0A",
        text: "#FFFFFF",
        border: "#27272A",
      },
      footer: {
        background: "#0A0A0A",
        text: "#FFFFFF",
        border: "#27272A",
      },
    },
    modal: {
      background: "#000000",
      border: "#27272A",
      shadow:
        "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.7)",
      header: {
        background: "#0A0A0A",
        text: "#FFFFFF",
        border: "#27272A",
      },
      body: {
        background: "#000000",
        text: "#FFFFFF",
      },
      footer: {
        background: "#0A0A0A",
        text: "#FFFFFF",
        border: "#27272A",
      },
      closeButton: {
        background: "transparent",
        backgroundHover: "#27272A",
        text: "#A1A1AA",
        textHover: "#FFFFFF",
      },
    },
  },

  // Light theme colors
  light: {
    // Background colors
    background: {
      primary: "#ffffff",
      secondary: "#fafafa", // zinc-50
      tertiary: "#f4f4f5", // zinc-100
      panel: "#ffffff",
      tooltip: "#ffffff",
      overlay: "rgba(255, 255, 255, 0.7)",
      volumePanel: "#fafafa", // zinc-50
      indicatorPanel: "#fafafa", // zinc-50
      settingsPanel: "rgba(255, 255, 255, 0.3)",
      headerGradient:
        "linear-gradient(to bottom, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0) 100%)",
    },

    // Text colors
    text: {
      primary: "rgba(0, 0, 0, 0.9)",
      secondary: "rgba(63, 63, 70, 0.7)",
      tertiary: "rgba(63, 63, 70, 0.5)",
      label: "rgba(63, 63, 70, 0.7)",
      value: "#000000",
      positive: "#16a34a", // Updated to match orderbook - slightly darker for light theme
      negative: "#dc2626", // Updated to match orderbook - slightly darker for light theme
    },

    // Border colors
    border: {
      primary: "rgba(161, 161, 170, 0.2)",
      secondary: "rgba(161, 161, 170, 0.1)",
      panel: "#e4e4e7", // zinc-200
      active: "#3b82f6",
    },

    // Grid colors
    grid: {
      primary: "rgba(161, 161, 170, 0.05)",
      secondary: "rgba(161, 161, 170, 0.03)",
      horizontal: "rgba(161, 161, 170, 0.05)",
      vertical: "rgba(161, 161, 170, 0.05)",
    },

    // Axis colors
    axis: {
      price: {
        text: "rgba(113, 113, 122, 0.7)",
        line: "rgba(161, 161, 170, 0.2)",
        tick: "rgba(161, 161, 170, 0.2)",
        background: "#f4f4f5", // Updated to zinc-100
      },
      time: {
        text: "rgba(113, 113, 122, 0.7)",
        line: "rgba(161, 161, 170, 0.1)",
        tick: "rgba(161, 161, 170, 0.2)",
        background: "#f4f4f5", // Updated to zinc-100
      },
    },

    // Candle colors
    candle: {
      bullish: {
        body: "#16a34a", // Green (slightly darker for light theme)
        border: "#16a34a",
        wick: "#16a34a",
      },
      bearish: {
        body: "#dc2626", // Red (slightly darker for light theme)
        border: "#dc2626",
        wick: "#dc2626",
      },
      doji: {
        body: "#787b86",
        border: "#787b86",
        wick: "#787b86",
      },
    },

    // Volume colors
    volume: {
      bullish: "rgba(22, 163, 74, 0.5)", // Green (slightly darker for light theme)
      bearish: "rgba(220, 38, 38, 0.5)", // Red (slightly darker for light theme)
    },

    // Line chart colors
    line: {
      primary: "#3b82f6",
      secondary: "#16a34a", // Green (slightly darker for light theme)
    },

    // Area chart colors
    area: {
      line: "#3b82f6",
      fill: "rgba(59, 130, 246, 0.1)",
      gradient: {
        top: "rgba(59, 130, 246, 0.2)",
        bottom: "rgba(59, 130, 246, 0.02)",
      },
    },

    // Crosshair colors
    crosshair: {
      line: "rgba(63, 63, 70, 0.4)",
      label: {
        background: "#f8f9fa",
        text: "#16a34a", // Green (slightly darker for light theme)
      },
    },

    // Price line colors
    priceLine: {
      bullish: "#16a34a", // Green (slightly darker for light theme)
      bearish: "#dc2626", // Red (slightly darker for light theme)
      neutral: "#787b86",
      label: {
        text: "#ffffff",
      },
    },

    // Indicator colors
    indicator: {
      panel: {
        background: "rgba(255, 255, 255, 0.7)",
        header: "rgba(240, 241, 245, 0.8)",
        border: "rgba(0, 0, 0, 0.1)",
      },
      rsi: {
        line: "#f59e0b",
        overbought: "rgba(220, 38, 38, 0.2)", // Red (slightly darker for light theme)
        oversold: "rgba(22, 163, 74, 0.2)", // Green (slightly darker for light theme)
        middle: "rgba(63, 63, 70, 0.2)",
      },
      macd: {
        line: "#3b82f6",
        signal: "#dc2626", // Red (slightly darker for light theme)
        histogram: {
          positive: "rgba(22, 163, 74, 0.6)", // Green (slightly darker for light theme)
          negative: "rgba(220, 38, 38, 0.6)", // Red (slightly darker for light theme)
        },
      },
    },

    // Expiry marker colors
    expiryMarker: {
      line: {
        normal: "rgba(245, 158, 11, 0.8)",
        expiringSoon: "rgba(220, 38, 38, 0.7)", // Red (slightly darker for light theme)
      },
      gradient: {
        top: "rgba(245, 158, 11, 0.1)",
        middle: "rgba(245, 158, 11, 0.8)",
        bottom: "rgba(245, 158, 11, 0.1)",
      },
      countdown: {
        background: "rgba(245, 158, 11, 0.85)",
        expiringSoon: "rgba(220, 38, 38, 0.85)", // Red (slightly darker for light theme)
        text: "#ffffff",
      },
    },

    // Position marker colors
    positionMarker: {
      call: {
        primary: "#16a34a", // Green (slightly darker for light theme)
        secondary: "#22c55e", // Standard green
        accent: "#15803d", // Darkest green
      },
      put: {
        primary: "#dc2626", // Red (slightly darker for light theme)
        secondary: "#ef4444", // Standard red
        accent: "#b91c1c", // Darkest red
      },
      result: {
        win: "#16a34a", // Green (slightly darker for light theme)
        loss: "#dc2626", // Red (slightly darker for light theme)
      },
    },

    // UI element colors
    ui: {
      button: {
        primary: {
          background: "#3b82f6",
          hover: "#2563eb",
          text: "#ffffff",
        },
        secondary: {
          background: "#e4e4e7", // zinc-200
          hover: "#d4d4d8", // zinc-300
          text: "#27272a", // zinc-800
        },
        success: {
          background: "#16a34a", // Green (slightly darker for light theme)
          hover: "#15803d", // Darker green
          text: "#ffffff",
        },
        danger: {
          background: "#dc2626", // Red (slightly darker for light theme)
          hover: "#b91c1c", // Darker red
          text: "#ffffff",
        },
      },
      toggle: {
        active: "#16a34a", // Green (slightly darker for light theme)
        inactive: "#d4d4d8", // zinc-300
        background: "rgba(255, 255, 255, 0.5)",
      },
      dropdown: {
        background: "#f4f4f5", // zinc-100
        border: "#e4e4e7", // zinc-200
        hover: "#e4e4e7", // zinc-200
        text: "#27272a", // zinc-800
      },
      tooltip: {
        background: "#f4f4f5", // zinc-100
        border: "#e4e4e7", // zinc-200
        text: "#27272a", // zinc-800
      },
    },
    popover: {
      background: "rgba(255, 255, 255, 0.98)",
      backgroundAlternate: "#F8F8F8",
      border: "#E4E4E7",
      shadow:
        "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      text: {
        primary: "#18181B",
        secondary: "#52525B",
        tertiary: "#71717A",
      },
      item: {
        hover: "#F4F4F5",
        active: "#E4E4E7",
        text: "#18181B",
        textHover: "#18181B",
        textActive: "#18181B",
      },
      header: {
        background: "#F9FAFB",
        text: "#18181B",
        border: "#E4E4E7",
      },
      footer: {
        background: "#F9FAFB",
        text: "#18181B",
        border: "#E4E4E7",
      },
    },
    modal: {
      background: "#FFFFFF",
      border: "#E4E4E7",
      shadow:
        "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.05)",
      header: {
        background: "#F9FAFB",
        text: "#18181B",
        border: "#E4E4E7",
      },
      body: {
        background: "#FFFFFF",
        text: "#18181B",
      },
      footer: {
        background: "#F9FAFB",
        text: "#18181B",
        border: "#E4E4E7",
      },
      closeButton: {
        background: "transparent",
        backgroundHover: "#F4F4F5",
        text: "#71717A",
        textHover: "#18181B",
      },
    },
  },
};

// Helper function to get colors based on theme
export const getChartColors = (isDarkMode: boolean) => {
  return isDarkMode ? chartColors.dark : chartColors.light;
};

// Export specific color getters for convenience
export const getBackgroundColor = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).background.primary;
};

export const getGridColor = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).grid.primary;
};

export const getAxisColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).axis;
};

export const getCandleColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).candle;
};

export const getVolumeColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).volume;
};

export const getCrosshairColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).crosshair;
};

export const getPriceLineColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).priceLine;
};

export const getTextColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).text;
};

export const getBorderColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).border;
};

export const getIndicatorColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).indicator;
};

export const getExpiryMarkerColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).expiryMarker;
};

export const getPositionMarkerColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).positionMarker;
};

export const getUIColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).ui;
};

export const getPopoverColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).popover;
};

export const getModalColors = (isDarkMode: boolean) => {
  return getChartColors(isDarkMode).modal;
};

// Add these helper functions at the end of the file

/**
 * Returns properly configured styles for popovers
 * @param isDark - Whether to use dark theme
 * @returns CSS properties for popovers and menus
 */
export const getPopoverStyle = (isDark: boolean) => {
  const colors = getChartColors(isDark);
  return {
    background: colors.popover.background,
    border: `1px solid ${colors.popover.border}`,
    color: colors.popover.text.primary,
    boxShadow: colors.popover.shadow,
  };
};

/**
 * Returns properly configured styles for modals
 * @param isDark - Whether to use dark theme
 * @returns CSS properties for modals
 */
export const getModalStyle = (isDark: boolean) => {
  const colors = getChartColors(isDark);
  return {
    background: colors.modal.background,
    border: `1px solid ${colors.modal.border}`,
    color: colors.modal.body.text,
    boxShadow: colors.modal.shadow,
  };
};

/**
 * Returns properly configured styles for headers in popovers and modals
 * @param isDark - Whether to use dark theme
 * @param isModal - Whether this is for a modal (vs popover)
 * @returns CSS properties for headers
 */
export const getHeaderStyle = (isDark: boolean, isModal = false) => {
  const colors = getChartColors(isDark);
  const section = isModal ? colors.modal.header : colors.popover.header;

  return {
    background: section.background,
    borderBottom: `1px solid ${section.border}`,
    color: section.text,
  };
};

/**
 * Returns properly configured styles for footers in popovers and modals
 * @param isDark - Whether to use dark theme
 * @param isModal - Whether this is for a modal (vs popover)
 * @returns CSS properties for footers
 */
export const getFooterStyle = (isDark: boolean, isModal = false) => {
  const colors = getChartColors(isDark);
  const section = isModal ? colors.modal.footer : colors.popover.footer;

  return {
    background: section.background,
    borderTop: `1px solid ${section.border}`,
    color: section.text,
  };
};
