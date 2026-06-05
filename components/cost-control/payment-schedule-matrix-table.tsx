"use client";

import { Fragment } from "react";

import { formatUsd } from "@/lib/format-usd";
import type { Language } from "@/lib/i18n";
import {
  formatPaymentMonthHeader,
  formatPoIssueDateDisplay,
  groupMatrixBySupplier,
  type PaymentScheduleMatrix,
  type PaymentScheduleMatrixRow,
  type PaymentScheduleMatrixTotals,
} from "@/lib/payment-schedule-matrix";

type Labels = {
  supplier: string;
  sku: string;
  bto: string;
  bts: string;
  poDate: string;
  total: string;
  depositSection: string;
  balanceSection: string;
  empty: string;
  totalRow: string;
  supplierSubtotal?: string;
};

type Props = {
  matrix: PaymentScheduleMatrix;
  language: Language;
  labels: Labels;
  showForecastMonth?: boolean;
  forecastMonthLabel?: string;
  /** When set, insert a subtotal row after each supplier's SKU lines, then a grand total. */
  groupBySupplier?: boolean;
  supplierOrder?: string[];
};

function cellAmount(amount: number): string {
  if (amount === 0) return "";
  return formatUsd(amount, 2);
}

function renderDataRow(
  row: PaymentScheduleMatrixRow,
  monthKeys: string[],
  showForecastMonth: boolean | undefined,
  language: Language,
) {
  return (
    <tr key={row.id} className="border-b border-app-border/40">
      <td className="max-w-[10rem] truncate px-2 py-2" title={row.supplierName}>
        {row.supplierName}
      </td>
      <td className="whitespace-nowrap px-2 py-2 font-medium">{row.sku}</td>
      {showForecastMonth ? (
        <td className="whitespace-nowrap px-2 py-2 text-app-muted">
          {formatPaymentMonthHeader(row.forecastMonth.slice(0, 7), language)}
        </td>
      ) : null}
      <td className="px-2 py-2 tabular-nums">{row.buildToOrder}</td>
      <td className="px-2 py-2 tabular-nums">{row.buildToStock}</td>
      <td className="whitespace-nowrap px-2 py-2">{formatPoIssueDateDisplay(row.poIssueDate)}</td>
      <td className="whitespace-nowrap px-2 py-2 tabular-nums font-medium">
        {row.lineTotalUsd != null ? formatUsd(row.lineTotalUsd, 2) : "—"}
      </td>
      {monthKeys.map((mk) => (
        <td key={`d-${row.id}-${mk}`} className="px-2 py-2 text-right tabular-nums text-app-muted">
          {cellAmount(row.depositByMonth[mk] ?? 0)}
        </td>
      ))}
      {monthKeys.map((mk) => (
        <td
          key={`b-${row.id}-${mk}`}
          className="border-l border-app-border/30 px-2 py-2 text-right tabular-nums first:border-l-0"
        >
          {cellAmount(row.balanceByMonth[mk] ?? 0)}
        </td>
      ))}
    </tr>
  );
}

function renderTotalsRow(
  key: string,
  label: string,
  totals: PaymentScheduleMatrixTotals,
  monthKeys: string[],
  colSpan: number,
  className: string,
) {
  return (
    <tr key={key} className={className}>
      <td className="px-2 py-2" colSpan={colSpan}>
        {label}
      </td>
      <td className="whitespace-nowrap px-2 py-2 tabular-nums">{formatUsd(totals.lineTotalUsd, 2)}</td>
      {monthKeys.map((mk) => (
        <td key={`${key}-td-${mk}`} className="px-2 py-2 text-right tabular-nums">
          {cellAmount(totals.depositByMonth[mk] ?? 0)}
        </td>
      ))}
      {monthKeys.map((mk) => (
        <td
          key={`${key}-tb-${mk}`}
          className="border-l border-app-border/30 px-2 py-2 text-right tabular-nums first:border-l-0"
        >
          {cellAmount(totals.balanceByMonth[mk] ?? 0)}
        </td>
      ))}
    </tr>
  );
}

export function PaymentScheduleMatrixTable({
  matrix,
  language,
  labels,
  showForecastMonth,
  forecastMonthLabel,
  groupBySupplier,
  supplierOrder = [],
}: Props) {
  const { monthKeys, rows, totals } = matrix;
  const colSpan = 6 + (showForecastMonth ? 1 : 0);
  const minWidth = Math.max(900, 520 + monthKeys.length * 88 * 2);
  const groups = groupBySupplier ? groupMatrixBySupplier(matrix, supplierOrder) : null;
  const subtotalLabel = (name: string) =>
    labels.supplierSubtotal ? `${labels.supplierSubtotal}: ${name}` : `${labels.totalRow}: ${name}`;

  if (rows.length === 0 || monthKeys.length === 0) {
    return <p className="mt-3 text-sm text-app-muted">{labels.empty}</p>;
  }

  return (
    <div className="app-table-shell mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-xs sm:text-sm" style={{ minWidth: `${minWidth}px` }}>
        <thead>
          <tr className="border-b border-app-border/80 bg-app-surface/80 text-left text-app-muted">
            <th className="px-2 py-2" rowSpan={2}>
              {labels.supplier}
            </th>
            <th className="px-2 py-2" rowSpan={2}>
              {labels.sku}
            </th>
            {showForecastMonth ? (
              <th className="px-2 py-2" rowSpan={2}>
                {forecastMonthLabel}
              </th>
            ) : null}
            <th className="px-2 py-2" rowSpan={2}>
              {labels.bto}
            </th>
            <th className="px-2 py-2" rowSpan={2}>
              {labels.bts}
            </th>
            <th className="px-2 py-2" rowSpan={2}>
              {labels.poDate}
            </th>
            <th className="px-2 py-2" rowSpan={2}>
              {labels.total}
            </th>
            <th className="border-l border-app-border/60 px-2 py-2 text-center" colSpan={monthKeys.length}>
              {labels.depositSection}
            </th>
            <th className="border-l border-app-border/60 px-2 py-2 text-center" colSpan={monthKeys.length}>
              {labels.balanceSection}
            </th>
          </tr>
          <tr className="border-b border-app-border/80 bg-app-surface/60 text-left text-app-muted">
            {monthKeys.map((mk) => (
              <th key={`d-h-${mk}`} className="whitespace-nowrap px-2 py-1.5 text-center font-normal">
                {formatPaymentMonthHeader(mk, language)}
              </th>
            ))}
            {monthKeys.map((mk) => (
              <th
                key={`b-h-${mk}`}
                className="whitespace-nowrap border-l border-app-border/40 px-2 py-1.5 text-center font-normal first:border-l-0"
              >
                {formatPaymentMonthHeader(mk, language)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups
            ? groups.map((group) => (
                <Fragment key={group.supplierName}>
                  {group.rows.map((row) =>
                    renderDataRow(row, monthKeys, showForecastMonth, language),
                  )}
                  {renderTotalsRow(
                    `sub-${group.supplierName}`,
                    subtotalLabel(group.supplierName),
                    group.subtotal,
                    monthKeys,
                    colSpan,
                    "border-t border-app-border/70 bg-app-surface/50 font-medium",
                  )}
                </Fragment>
              ))
            : rows.map((row) => renderDataRow(row, monthKeys, showForecastMonth, language))}
          {renderTotalsRow(
            "grand-total",
            labels.totalRow,
            totals,
            monthKeys,
            colSpan,
            "border-t-2 border-app-border bg-app-surface/90 font-semibold",
          )}
        </tbody>
      </table>
    </div>
  );
}
