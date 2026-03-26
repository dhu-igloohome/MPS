import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  getContractById,
  getOrderProgressById,
  sessionCanAccessOrderProgressRegion,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

function statusBadgeClass(status: "draft" | "approved" | "sent") {
  if (status === "draft") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "approved") return "bg-sky-50 text-sky-700 ring-sky-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export default async function ContractDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const contract = await getContractById(id);
  if (!contract) notFound();

  const order = await getOrderProgressById(contract.orderProgressId);
  if (!order || !sessionCanAccessOrderProgressRegion(session.regions, order.region)) {
    notFound();
  }

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? `Contract ${contract.poNumber}` : `Contract ${contract.poNumber}`}
      description={language === "en" ? "Contract details and attachment actions." : "Contract details and attachment actions."}
    >
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">Contract Detail</h3>
          <div className="flex gap-2">
            <Link className="rounded border border-app-border px-3 py-1.5 text-sm hover:bg-app-accent-soft" href="/contracts">Back to list</Link>
            <a className="rounded border border-app-border px-3 py-1.5 text-sm hover:bg-app-accent-soft" href={`/api/contracts/${encodeURIComponent(contract.id)}/pdf`}>Download PDF</a>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          <div><dt className="text-xs text-app-muted">PO Number</dt><dd className="text-sm text-foreground">{contract.poNumber}</dd></div>
          <div>
            <dt className="text-xs text-app-muted">Status</dt>
            <dd className="text-sm text-foreground">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ${statusBadgeClass(contract.status)}`}
              >
                {contract.status}
              </span>
            </dd>
          </div>
          <div><dt className="text-xs text-app-muted">Supplier</dt><dd className="text-sm text-foreground">{contract.supplierName}</dd></div>
          <div><dt className="text-xs text-app-muted">Order Number</dt><dd className="text-sm text-foreground">{order.orderNumber || "-"}</dd></div>
          <div><dt className="text-xs text-app-muted">Product</dt><dd className="text-sm text-foreground">{contract.productName}</dd></div>
          <div><dt className="text-xs text-app-muted">SKU</dt><dd className="text-sm text-foreground">{contract.sku}</dd></div>
          <div><dt className="text-xs text-app-muted">Quantity</dt><dd className="text-sm text-foreground">{contract.quantity}</dd></div>
          <div><dt className="text-xs text-app-muted">Unit Cost</dt><dd className="text-sm text-foreground">{contract.unitCost.toFixed(2)}</dd></div>
          <div><dt className="text-xs text-app-muted">Total</dt><dd className="text-sm text-foreground">{contract.totalAmount.toFixed(2)}</dd></div>
          <div><dt className="text-xs text-app-muted">Delivery Date</dt><dd className="text-sm text-foreground">{contract.deliveryDate}</dd></div>
          <div><dt className="text-xs text-app-muted">Batch</dt><dd className="text-sm text-foreground">{contract.batch || "-"}</dd></div>
          <div><dt className="text-xs text-app-muted">Serial / Bluetooth</dt><dd className="text-sm text-foreground">{`${contract.serialCode || "-"} / ${contract.bluetoothId || "-"}`}</dd></div>
        </dl>
      </section>
    </AppShell>
  );
}
