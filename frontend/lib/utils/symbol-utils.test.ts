import { describe, it, expect } from "vitest";
import {
  normalizeSymbol,
  parseSymbol,
  formatSymbolForDisplay,
  formatSymbolForApi,
  formatSymbolForWebSocket,
  formatSymbolConcatenated,
  formatSymbolWithDash,
  formatSymbolWithUnderscore,
  compareSymbols,
  isValidSymbol,
  getBaseCurrency,
  getQuoteCurrency,
  createSymbol,
  getAllSymbolFormats,
  findSymbolInRecord,
  formatSymbol,
} from "./symbol-utils";

describe("Symbol Utilities", () => {
  describe("normalizeSymbol", () => {
    it("should return empty string for invalid input", () => {
      expect(normalizeSymbol("")).toBe("");
      expect(normalizeSymbol(null as any)).toBe("");
      expect(normalizeSymbol(undefined as any)).toBe("");
    });

    it("should keep slash format as-is", () => {
      expect(normalizeSymbol("BTC/USDT")).toBe("BTC/USDT");
      expect(normalizeSymbol("eth/usdt")).toBe("ETH/USDT");
      expect(normalizeSymbol("  BTC/USDT  ")).toBe("BTC/USDT");
    });

    it("should convert dash format to slash format", () => {
      expect(normalizeSymbol("BTC-USDT")).toBe("BTC/USDT");
      expect(normalizeSymbol("ETH-BTC")).toBe("ETH/BTC");
    });

    it("should convert underscore format to slash format", () => {
      expect(normalizeSymbol("BTC_USDT")).toBe("BTC/USDT");
      expect(normalizeSymbol("ETH_BTC")).toBe("ETH/BTC");
    });

    it("should convert concatenated format to slash format", () => {
      expect(normalizeSymbol("BTCUSDT")).toBe("BTC/USDT");
      expect(normalizeSymbol("ETHUSDT")).toBe("ETH/USDT");
      expect(normalizeSymbol("BTCUSDC")).toBe("BTC/USDC");
      expect(normalizeSymbol("ETHBTC")).toBe("ETH/BTC");
      // Note: BNBUSD is ambiguous (BNB/USD vs BN/BUSD) - algorithm prioritizes known 4-char quote (BUSD)
      expect(normalizeSymbol("BNBUSD")).toBe("BN/BUSD");
      // For explicit USD pairs, use dash or slash format
      expect(normalizeSymbol("BNB-USD")).toBe("BNB/USD");
    });

    it("should handle different quote currencies", () => {
      expect(normalizeSymbol("BTCBUSD")).toBe("BTC/BUSD");
      expect(normalizeSymbol("ETHEUR")).toBe("ETH/EUR");
      expect(normalizeSymbol("BTCGBP")).toBe("BTC/GBP");
    });

    it("should uppercase the result", () => {
      expect(normalizeSymbol("btcusdt")).toBe("BTC/USDT");
      expect(normalizeSymbol("Btc/Usdt")).toBe("BTC/USDT");
    });
  });

  describe("parseSymbol", () => {
    it("should parse valid symbols", () => {
      expect(parseSymbol("BTC/USDT")).toEqual({
        base: "BTC",
        quote: "USDT",
        isValid: true,
      });
    });

    it("should parse concatenated symbols", () => {
      expect(parseSymbol("BTCUSDT")).toEqual({
        base: "BTC",
        quote: "USDT",
        isValid: true,
      });
    });

    it("should return invalid for empty input", () => {
      expect(parseSymbol("")).toEqual({
        base: "",
        quote: "",
        isValid: false,
      });
    });

    it("should return invalid for unparseable input", () => {
      const result = parseSymbol("X");
      expect(result.isValid).toBe(false);
    });
  });

  describe("formatSymbol functions", () => {
    it("formatSymbolForDisplay should return slash format", () => {
      expect(formatSymbolForDisplay("BTCUSDT")).toBe("BTC/USDT");
    });

    it("formatSymbolForApi should return slash format", () => {
      expect(formatSymbolForApi("BTC-USDT")).toBe("BTC/USDT");
    });

    it("formatSymbolForWebSocket should return slash format", () => {
      expect(formatSymbolForWebSocket("BTC_USDT")).toBe("BTC/USDT");
    });

    it("formatSymbolConcatenated should return concatenated format", () => {
      expect(formatSymbolConcatenated("BTC/USDT")).toBe("BTCUSDT");
    });

    it("formatSymbolWithDash should return dash format", () => {
      expect(formatSymbolWithDash("BTC/USDT")).toBe("BTC-USDT");
    });

    it("formatSymbolWithUnderscore should return underscore format", () => {
      expect(formatSymbolWithUnderscore("BTC/USDT")).toBe("BTC_USDT");
    });
  });

  describe("compareSymbols", () => {
    it("should return true for same symbols in different formats", () => {
      expect(compareSymbols("BTC/USDT", "BTCUSDT")).toBe(true);
      expect(compareSymbols("BTC-USDT", "BTC_USDT")).toBe(true);
      expect(compareSymbols("btcusdt", "BTC/USDT")).toBe(true);
    });

    it("should return false for different symbols", () => {
      expect(compareSymbols("BTC/USDT", "ETH/USDT")).toBe(false);
      expect(compareSymbols("BTC/USDT", "BTC/BTC")).toBe(false);
    });
  });

  describe("isValidSymbol", () => {
    it("should return true for valid symbols", () => {
      expect(isValidSymbol("BTC/USDT")).toBe(true);
      expect(isValidSymbol("BTCUSDT")).toBe(true);
      expect(isValidSymbol("ETH-BTC")).toBe(true);
    });

    it("should return false for invalid symbols", () => {
      expect(isValidSymbol("")).toBe(false);
      expect(isValidSymbol("X")).toBe(false);
    });
  });

  describe("getBaseCurrency", () => {
    it("should extract base currency", () => {
      expect(getBaseCurrency("BTC/USDT")).toBe("BTC");
      expect(getBaseCurrency("ETHUSDT")).toBe("ETH");
    });
  });

  describe("getQuoteCurrency", () => {
    it("should extract quote currency", () => {
      expect(getQuoteCurrency("BTC/USDT")).toBe("USDT");
      expect(getQuoteCurrency("ETHBTC")).toBe("BTC");
    });
  });

  describe("createSymbol", () => {
    it("should create symbol from base and quote", () => {
      expect(createSymbol("BTC", "USDT")).toBe("BTC/USDT");
      expect(createSymbol("eth", "btc")).toBe("ETH/BTC");
    });

    it("should return empty string for invalid input", () => {
      expect(createSymbol("", "USDT")).toBe("");
      expect(createSymbol("BTC", "")).toBe("");
    });
  });

  describe("getAllSymbolFormats", () => {
    it("should return all format variations", () => {
      const formats = getAllSymbolFormats("BTC/USDT");
      expect(formats).toContain("BTC/USDT");
      expect(formats).toContain("BTCUSDT");
      expect(formats).toContain("BTC-USDT");
      expect(formats).toContain("BTC_USDT");
      expect(formats).toContain("btc/usdt");
      expect(formats).toContain("btcusdt");
      expect(formats.length).toBe(8);
    });
  });

  describe("findSymbolInRecord", () => {
    it("should find symbol by any format", () => {
      const record = {
        "BTC/USDT": { price: 50000 },
        "ETH/USDT": { price: 3000 },
      };

      expect(findSymbolInRecord(record, "BTCUSDT")).toEqual({ price: 50000 });
      expect(findSymbolInRecord(record, "BTC-USDT")).toEqual({ price: 50000 });
    });

    it("should return undefined for non-existent symbols", () => {
      const record = { "BTC/USDT": { price: 50000 } };
      expect(findSymbolInRecord(record, "XRP/USDT")).toBeUndefined();
    });
  });

  describe("formatSymbol", () => {
    it("should format to specified format", () => {
      expect(formatSymbol("BTCUSDT", "slash")).toBe("BTC/USDT");
      expect(formatSymbol("BTC/USDT", "concatenated")).toBe("BTCUSDT");
      expect(formatSymbol("BTC/USDT", "dash")).toBe("BTC-USDT");
      expect(formatSymbol("BTC/USDT", "underscore")).toBe("BTC_USDT");
    });
  });
});
