"use client";

import { useState } from "react";

type TableCellLongTextProps = {
  text: string;
  /** Tailwind max-width on the preview block */
  maxWidthClass?: string;
  viewLabel: string;
  dialogTitle: string;
  closeLabel: string;
  emptyLabel?: string;
  /** Show “view full” when text length exceeds this (default 28) */
  expandThreshold?: number;
};

export function TableCellLongText({
  text,
  maxWidthClass = "max-w-[14rem]",
  viewLabel,
  dialogTitle,
  closeLabel,
  emptyLabel = "—",
  expandThreshold = 28,
}: TableCellLongTextProps) {
  const [open, setOpen] = useState(false);
  const trimmed = text.trim();

  if (!trimmed) {
    return <span className="text-app-muted">{emptyLabel}</span>;
  }

  const showExpand = trimmed.length > expandThreshold;

  return (
    <>
      <div className={`min-w-0 ${maxWidthClass}`}>
        <p className="line-clamp-2 break-words text-app-muted" title={trimmed}>
          {trimmed}
        </p>
        {showExpand ? (
          <button
            type="button"
            className="mt-0.5 text-left text-xs font-medium text-app-accent hover:underline"
            onClick={() => setOpen(true)}
          >
            {viewLabel}
          </button>
        ) : null}
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="table-cell-long-text-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="app-card max-h-[85vh] w-full max-w-lg overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="table-cell-long-text-title" className="text-base font-semibold text-foreground">
              {dialogTitle}
            </h4>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
              {trimmed}
            </p>
            <button
              type="button"
              className="app-button-secondary mt-4 px-4 py-2 text-sm"
              onClick={() => setOpen(false)}
            >
              {closeLabel}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
