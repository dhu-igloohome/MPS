import { toCsvLine } from "@/lib/csv";
import type { Language } from "@/lib/i18n";
import {
  formatForecastMonthLabel,
  formatPaymentMonthHeader,
  formatPoIssueDateDisplay,
  groupMatrixBySupplier,
  type PaymentScheduleMatrix,
  type PaymentScheduleMatrixTotals,
} from "@/lib/payment-schedule-matrix";

export type PaymentScheduleCsvLabels = {
  supplier: string;
  sku: string;
  bto: string;
  bts: string;
  poDate: string;
  total: string;
  depositSection: string;
  balanceSection: string;
  totalRow: string;
  supplierSubtotal: string;
  forecastMonthCol: string;
};

function csvAmount(amount: number): string {
  if (amount === 0) return "";
  return String(amount);
}

function buildHeader(
  monthKeys: string[],
  language: Language,
  labels: PaymentScheduleCsvLabels,
  showForecastMonth: boolean,
): string[] {
  const header = [
    labels.supplier,
    labels.sku,
    ...(showForecastMonth ? [labels.forecastMonthCol] : []),
    labels.bto,
    labels.bts,
    labels.poDate,
    labels.total,
  ];
  for (const mk of monthKeys) {
    header.push(`${labels.depositSection} ${formatPaymentMonthHeader(mk, language)}`);
  }
  for (const mk of monthKeys) {
    header.push(`${labels.balanceSection} ${formatPaymentMonthHeader(mk, language)}`);
  }
  return header;
}

function totalsToCells(
  label: string,
  totals: PaymentScheduleMatrixTotals,
  monthKeys: string[],
  identifierColCount: number,
): string[] {
  const cells: string[] = [label];
  for (let i = 1; i < identifierColCount; i++) cells.push("");
  cells.push(String(totals.lineTotalUsd));
  for (const mk of monthKeys) cells.push(csvAmount(totals.depositByMonth[mk] ?? 0));
  for (const mk of monthKeys) cells.push(csvAmount(totals.balanceByMonth[mk] ?? 0));
  return cells;
}

function matrixToLines(
  matrix: PaymentScheduleMatrix,
  language: Language,
  labels: PaymentScheduleCsvLabels,
  options: {
    showForecastMonth?: boolean;
    groupBySupplier?: boolean;
    supplierOrder?: string[];
  },
): string[] {
  const { monthKeys, rows, totals } = matrix;
  if (rows.length === 0 || monthKeys.length === 0) return [];

  const showForecastMonth = options.showForecastMonth ?? false;
  const identifierColCount = 5 + (showForecastMonth ? 1 : 0);
  const lines: string[] = [toCsvLine(buildHeader(monthKeys, language, labels, showForecastMonth))];

  const pushDataRow = (row: (typeof rows)[number]) => {
    const cells: string[] = [
      row.supplierName,
      row.sku,
      ...(showForecastMonth
        ? [formatForecastMonthLabel(row.forecastMonth.slice(0, 7), language)]
        : []),
      String(row.buildToOrder),
      String(row.buildToStock),
      formatPoIssueDateDisplay(row.poIssueDate),
      row.lineTotalUsd != null ? String(row.lineTotalUsd) : "",
    ];
    for (const mk of monthKeys) cells.push(csvAmount(row.depositByMonth[mk] ?? 0));
    for (const mk of monthKeys) cells.push(csvAmount(row.balanceByMonth[mk] ?? 0));
    lines.push(toCsvLine(cells));
  };

  if (options.groupBySupplier) {
    const groups = groupMatrixBySupplier(matrix, options.supplierOrder ?? []);
    for (const group of groups) {
      for (const row of group.rows) pushDataRow(row);
      lines.push(
        toCsvLine(
          totalsToCells(
            `${labels.supplierSubtotal}: ${group.supplierName}`,
            group.subtotal,
            monthKeys,
            identifierColCount,
          ),
        ),
      );
    }
  } else {
    for (const row of rows) pushDataRow(row);
  }

  lines.push(
    toCsvLine(totalsToCells(labels.totalRow, totals, monthKeys, identifierColCount)),
  );
  return lines;
}

function downloadCsvLines(lines: string[], filename: string): void {
  if (lines.length === 0) return;
  const body = `\uFEFF${lines.join("\r\n")}`;
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportPaymentScheduleSkuCsv(
  matrix: PaymentScheduleMatrix,
  language: Language,
  labels: PaymentScheduleCsvLabels,
  forecastMonthFilter: string,
): void {
  const lines = matrixToLines(matrix, language, labels, {
    showForecastMonth: forecastMonthFilter === "all",
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const monthPart = forecastMonthFilter === "all" ? "all-months" : forecastMonthFilter;
  downloadCsvLines(lines, `payment-schedule-by-sku-${monthPart}-${stamp}.csv`);
}

export function exportPaymentScheduleSupplierCsv(
  matrix: PaymentScheduleMatrix,
  language: Language,
  labels: PaymentScheduleCsvLabels,
  forecastMonthFilter: string,
  supplierOrder: string[],
): void {
  const lines = matrixToLines(matrix, language, labels, {
    showForecastMonth: forecastMonthFilter === "all",
    groupBySupplier: true,
    supplierOrder,
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const monthPart = forecastMonthFilter === "all" ? "all-months" : forecastMonthFilter;
  downloadCsvLines(lines, `payment-schedule-by-supplier-${monthPart}-${stamp}.csv`);
}

export function paymentScheduleMatrixExportable(matrix: PaymentScheduleMatrix): boolean {
  return matrix.rows.length > 0 && matrix.monthKeys.length > 0;
}
