"use client";

import Link from "next/link";

import { PrintablePO, type PrintablePOData } from "@/components/contract/printable-po";

type PrintablePOPageProps = {
  poData: PrintablePOData;
  backHref: string;
};

export function PrintablePOPage({ poData, backHref }: PrintablePOPageProps) {
  return (
    <div className="min-h-screen bg-white p-4 text-black print:m-0 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex w-full max-w-[210mm] items-center justify-between print:hidden">
        <Link className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50" href={backHref}>
          Back to contract detail
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Print PO
        </button>
      </div>
      <PrintablePO poData={poData} />
    </div>
  );
}
