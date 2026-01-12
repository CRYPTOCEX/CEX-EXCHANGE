"use client";

/**
 * Export Trades Component
 *
 * Download trade history in various formats (CSV, Excel).
 */

import { memo, useState, useCallback } from "react";
import { Download, FileSpreadsheet, FileText, Check } from "lucide-react";
import type { CompletedOrder } from "@/store/trade/use-binary-store";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPES
// ============================================================================

interface ExportTradesProps {
  trades: CompletedOrder[];
  currency?: string;
  theme?: "dark" | "light";
}

type ExportFormat = "csv" | "excel";

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function generateCSV(trades: CompletedOrder[]): string {
  const headers = [
    "ID",
    "Date",
    "Time",
    "Symbol",
    "Side",
    "Entry Price",
    "Exit Price",
    "Amount",
    "Profit/Loss",
    "Status",
    "Duration (s)",
  ];

  const rows = trades.map((trade) => {
    const duration = Math.round(
      (trade.expiryTime.getTime() - trade.entryTime.getTime()) / 1000
    );
    const pnl = trade.status === "WIN" ? trade.profit || 0 : -(trade.profit || trade.amount);

    return [
      trade.id,
      formatDate(trade.expiryTime),
      formatTime(trade.expiryTime),
      trade.symbol,
      trade.side,
      trade.entryPrice.toFixed(4),
      trade.closePrice.toFixed(4),
      trade.amount.toFixed(2),
      pnl.toFixed(2),
      trade.status,
      duration.toString(),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

function generateExcelXML(trades: CompletedOrder[], currency: string): string {
  // Generate Excel-compatible XML
  const escapeXML = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const rows = trades.map((trade) => {
    const duration = Math.round(
      (trade.expiryTime.getTime() - trade.entryTime.getTime()) / 1000
    );
    const pnl = trade.status === "WIN" ? trade.profit || 0 : -(trade.profit || trade.amount);

    return `
      <Row>
        <Cell><Data ss:Type="String">${escapeXML(trade.id)}</Data></Cell>
        <Cell><Data ss:Type="String">${formatDate(trade.expiryTime)}</Data></Cell>
        <Cell><Data ss:Type="String">${formatTime(trade.expiryTime)}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXML(trade.symbol)}</Data></Cell>
        <Cell><Data ss:Type="String">${trade.side}</Data></Cell>
        <Cell><Data ss:Type="Number">${trade.entryPrice}</Data></Cell>
        <Cell><Data ss:Type="Number">${trade.closePrice}</Data></Cell>
        <Cell><Data ss:Type="Number">${trade.amount}</Data></Cell>
        <Cell><Data ss:Type="Number">${pnl}</Data></Cell>
        <Cell><Data ss:Type="String">${trade.status}</Data></Cell>
        <Cell><Data ss:Type="Number">${duration}</Data></Cell>
      </Row>`;
  });

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#CCCCCC" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Win">
      <Font ss:Color="#22C55E"/>
    </Style>
    <Style ss:ID="Loss">
      <Font ss:Color="#EF4444"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Trade History">
    <Table>
      <Column ss:Width="100"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="60"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="80"/>
      <Column ss:Width="60"/>
      <Column ss:Width="80"/>
      <Row ss:StyleID="Header">
        <Cell><Data ss:Type="String">ID</Data></Cell>
        <Cell><Data ss:Type="String">Date</Data></Cell>
        <Cell><Data ss:Type="String">Time</Data></Cell>
        <Cell><Data ss:Type="String">Symbol</Data></Cell>
        <Cell><Data ss:Type="String">Side</Data></Cell>
        <Cell><Data ss:Type="String">Entry Price</Data></Cell>
        <Cell><Data ss:Type="String">Exit Price</Data></Cell>
        <Cell><Data ss:Type="String">Amount (${currency})</Data></Cell>
        <Cell><Data ss:Type="String">P/L (${currency})</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="String">Duration (s)</Data></Cell>
      </Row>
      ${rows.join("")}
    </Table>
  </Worksheet>
</Workbook>`;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ExportTrades = memo(function ExportTrades({
  trades,
  currency = "USDT",
  theme = "dark",
}: ExportTradesProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<ExportFormat | null>(null);

  // Theme classes
  const bgClass = theme === "dark" ? "bg-zinc-900" : "bg-white";
  const borderClass = theme === "dark" ? "border-zinc-800" : "border-zinc-200";
  const textClass = theme === "dark" ? "text-white" : "text-zinc-900";
  const subtitleClass = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
  const buttonBgClass = theme === "dark" ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-100 hover:bg-zinc-200";

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (trades.length === 0) return;

      setIsExporting(true);
      setExportedFormat(null);

      // Slight delay for UX
      setTimeout(() => {
        const timestamp = new Date().toISOString().split("T")[0];

        if (format === "csv") {
          const csv = generateCSV(trades);
          downloadFile(csv, `trade-history-${timestamp}.csv`, "text/csv;charset=utf-8;");
        } else {
          const excel = generateExcelXML(trades, currency);
          downloadFile(
            excel,
            `trade-history-${timestamp}.xls`,
            "application/vnd.ms-excel"
          );
        }

        setIsExporting(false);
        setExportedFormat(format);

        // Clear success state after 2 seconds
        setTimeout(() => setExportedFormat(null), 2000);
      }, 300);
    },
    [trades, currency]
  );

  const tradeCount = trades.length;
  const wins = trades.filter((t) => t.status === "WIN").length;
  const losses = trades.filter((t) => t.status === "LOSS").length;
  const totalPnL = trades.reduce((sum, t) => {
    const pnl = t.status === "WIN" ? t.profit || 0 : -(t.profit || t.amount);
    return sum + pnl;
  }, 0);

  return (
    <div className={`${bgClass} border ${borderClass} rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-medium ${subtitleClass} uppercase tracking-wide`}>
          {t("export_trade_history")}
        </h3>
        <Download size={18} className={subtitleClass} />
      </div>

      {/* Summary */}
      <div className={`mb-4 p-4 rounded-lg ${theme === "dark" ? "bg-zinc-800/50" : "bg-zinc-100"}`}>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className={`text-lg font-bold ${textClass}`}>{tradeCount}</div>
            <div className={`text-xs ${subtitleClass}`}>{tCommon("total_trades")}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-500">{wins}</div>
            <div className={`text-xs ${subtitleClass}`}>Wins</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-500">{losses}</div>
            <div className={`text-xs ${subtitleClass}`}>Losses</div>
          </div>
          <div>
            <div
              className={`text-lg font-bold ${
                totalPnL >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {totalPnL >= 0 ? "+" : ""}
              {totalPnL.toFixed(2)}
            </div>
            <div className={`text-xs ${subtitleClass}`}>{t("net_p_l")}</div>
          </div>
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleExport("csv")}
          disabled={isExporting || trades.length === 0}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
            ${buttonBgClass} ${textClass}
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {exportedFormat === "csv" ? (
            <Check size={18} className="text-green-500" />
          ) : (
            <FileText size={18} />
          )}
          <span className="text-sm font-medium">
            {exportedFormat === "csv" ? "Downloaded!" : "Export CSV"}
          </span>
        </button>

        <button
          onClick={() => handleExport("excel")}
          disabled={isExporting || trades.length === 0}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
            ${buttonBgClass} ${textClass}
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {exportedFormat === "excel" ? (
            <Check size={18} className="text-green-500" />
          ) : (
            <FileSpreadsheet size={18} />
          )}
          <span className="text-sm font-medium">
            {exportedFormat === "excel" ? "Downloaded!" : "Export Excel"}
          </span>
        </button>
      </div>

      {/* Info */}
      <p className={`mt-4 text-xs ${subtitleClass} text-center`}>
        {t("export_includes_id_date_time_symbol")}
      </p>
    </div>
  );
});

export default ExportTrades;
