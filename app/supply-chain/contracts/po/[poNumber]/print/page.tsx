import { notFound, redirect } from "next/navigation";

import { PrintablePOPage } from "@/components/contract/printable-po-page";
import type { PrintablePOData } from "@/components/contract/printable-po";
import { listContractsByPoNumberInSessionRegions } from "@/lib/repositories";
import { getSession } from "@/lib/session";

type PageProps = { params: Promise<{ poNumber: string }> };

export const dynamic = "force-dynamic";

export default async function SupplyChainContractBatchPrintByPoPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { poNumber } = await params;
  const decodedPo = decodeURIComponent(poNumber || "");
  const contracts = await listContractsByPoNumberInSessionRegions(session.regions, decodedPo);
  if (contracts.length === 0) notFound();
  if (contracts.some((c) => !(c.status === "approved" || c.status === "sent"))) notFound();

  const first = contracts[0];
  const poData: PrintablePOData = {
    header: {
      companyName: "IG",
      poNumber: first.poNumber,
      date: first.signedDate || first.createdAt?.slice(0, 10) || "-",
    },
    buyerInfo: {
      name: "IG",
      contact: session.username || "-",
      phone: "-",
      address: first.deliveryAddress || "-",
    },
    vendorInfo: {
      name: first.supplierName || "-",
      contact: "-",
      phone: "-",
    },
    lineItems: contracts.map((item, index) => ({
      index: index + 1,
      materialCode: item.sku,
      description: item.productName,
      unit: "PCS",
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitCost || 0),
      totalPrice: Number(item.totalAmount || 0),
      deliveryDate: item.deliveryDate || "-",
      remark: item.batch || "-",
    })),
    summary: {
      totalAmount: contracts.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
      currency: first.currency || "USD",
    },
    terms: {
      paymentTerms: first.paymentTerms || "Cash",
      deliveryAddress: first.deliveryAddress || "-",
      qualityRemarks: first.qualityRemarks || "-",
    },
  };

  return <PrintablePOPage poData={poData} backHref="/supply-chain/contracts" />;
}

