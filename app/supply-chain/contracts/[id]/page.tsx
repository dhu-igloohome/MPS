import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { SupplyChainSubnav } from "@/components/supply-chain/supply-chain-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { getContractBuyerEntity } from "@/lib/contract-buyer-entities";
import {
  getContractById,
  getOrderProgressById,
  sessionCanAccessContract,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

function statusBadgeClass(status: "draft" | "approved" | "sent") {
  if (status === "draft") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "approved") return "bg-sky-50 text-sky-700 ring-sky-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export default async function SupplyChainContractDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const contract = await getContractById(id);
  if (!contract) notFound();

  const cookieStore = await cookies();
  if (!(await sessionCanAccessContract(session.regions, contract))) {
    notFound();
  }
  const order = contract.orderProgressId ? await getOrderProgressById(contract.orderProgressId) : null;
  const buyer = getContractBuyerEntity(
    contract.buyerEntityCode === "singapore" ? "singapore" : "shenzhen",
  );

  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const canPrint = contract.status === "approved" || contract.status === "sent";

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Supply Chain Management" : "供应链管理"}
      description={language === "en" ? "Suppliers, contracts and cost control in one module." : "将供应商、合同、成本控制整合到同一模块。"}
      moduleTabs={<SupplyChainSubnav language={language} />}
    >
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">Contract Detail</h3>
          <div className="flex gap-2">
            <Link className="rounded border border-app-border px-3 py-1.5 text-sm hover:bg-app-accent-soft" href="/supply-chain/contracts">Back to list</Link>
            {canPrint ? (
              <>
                <Link
                  className="rounded border border-app-border px-3 py-1.5 text-sm hover:bg-app-accent-soft"
                  href={`/supply-chain/contracts/${encodeURIComponent(contract.id)}/print`}
                >
                  Print PO
                </Link>
                <Link
                  className="rounded border border-app-border px-3 py-1.5 text-sm hover:bg-app-accent-soft"
                  href={`/supply-chain/contracts/po/${encodeURIComponent(contract.poNumber)}/print`}
                >
                  Batch Print (Same PO)
                </Link>
              </>
            ) : (
              <span className="rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-700">
                Waiting for super admin approval to print/forward
              </span>
            )}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="min-w-0"><dt className="text-xs text-app-muted">PO Number</dt><dd className="text-sm text-foreground">{contract.poNumber}</dd></div>
          <div className="min-w-0">
            <dt className="text-xs text-app-muted">Status</dt>
            <dd className="text-sm text-foreground">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ${statusBadgeClass(contract.status)}`}>
                {contract.status}
              </span>
            </dd>
          </div>
          <div className="min-w-0 md:col-span-2">
            <dt className="text-xs text-app-muted">{language === "en" ? "Buyer (Party A)" : "甲方"}</dt>
            <dd className="text-sm text-foreground">
              {buyer.legalName}
              <span className="block text-xs text-app-muted">{buyer.address}</span>
            </dd>
          </div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Supplier</dt><dd className="text-sm text-foreground">{contract.supplierName}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Order Number</dt><dd className="text-sm text-foreground">{order?.orderNumber || "—"}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Product</dt><dd className="text-sm text-foreground">{contract.productName}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">SKU</dt><dd className="text-sm text-foreground">{contract.sku}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Quantity</dt><dd className="text-sm text-foreground">{contract.quantity}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Unit Cost</dt><dd className="text-sm text-foreground">{contract.unitCost.toFixed(2)}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Total</dt><dd className="text-sm text-foreground">{contract.totalAmount.toFixed(2)}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Currency</dt><dd className="text-sm text-foreground">{contract.currency || "-"}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Payment Terms</dt><dd className="text-sm text-foreground">{contract.paymentTerms || "-"}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Delivery Date</dt><dd className="text-sm text-foreground">{contract.deliveryDate}</dd></div>
          <div className="min-w-0 md:col-span-2"><dt className="text-xs text-app-muted">Delivery Address</dt><dd className="text-sm text-foreground">{contract.deliveryAddress || "-"}</dd></div>
          <div className="min-w-0 md:col-span-2"><dt className="text-xs text-app-muted">{language === "en" ? "Remark" : "备注"}</dt><dd className="text-sm text-foreground">{contract.remark || "-"}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Batch</dt><dd className="text-sm text-foreground">{contract.batch || "-"}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-app-muted">Serial / Bluetooth</dt><dd className="text-sm text-foreground">{`${contract.serialCode || "-"} / ${contract.bluetoothId || "-"}`}</dd></div>
        </dl>
      </section>
    </AppShell>
  );
}

