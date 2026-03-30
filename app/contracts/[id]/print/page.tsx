import { notFound, redirect } from "next/navigation";

import { PrintablePOPage } from "@/components/contract/printable-po-page";
import type { PrintablePOData } from "@/components/contract/printable-po";
import {
  getContractById,
  getOrderProgressById,
  listSuppliers,
  sessionCanAccessOrderProgressRegion,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function ContractPrintPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const contract = await getContractById(id);
  if (!contract) notFound();
  if (!(contract.status === "approved" || contract.status === "sent")) {
    notFound();
  }

  const order = await getOrderProgressById(contract.orderProgressId);
  if (!order || !sessionCanAccessOrderProgressRegion(session.regions, order.region)) {
    notFound();
  }

  const suppliers = await listSuppliers();
  const supplier = suppliers.find((item) => item.id === contract.supplierId);
  const poData: PrintablePOData = {
    header: {
      companyName: "IG",
      poNumber: contract.poNumber,
      date: contract.signedDate || contract.createdAt?.slice(0, 10) || "-",
    },
    buyerInfo: {
      name: "IG",
      contact: session.username || "-",
      phone: "-",
      address: order.factoryName || "-",
    },
    vendorInfo: {
      name: contract.supplierName || supplier?.name || "-",
      contact: supplier?.contactName || "-",
      phone: supplier?.contactPhone || "-",
    },
    lineItems: [
      {
        index: 1,
        materialCode: contract.sku,
        description: contract.productName,
        unit: "PCS",
        quantity: Number(contract.quantity || 0),
        unitPrice: Number(contract.unitCost || 0),
        totalPrice: Number(contract.totalAmount || 0),
        deliveryDate: contract.deliveryDate || "-",
        remark: contract.batch || "-",
      },
    ],
    summary: {
      totalAmount: Number(contract.totalAmount || 0),
      currency: contract.currency || "USD",
    },
    terms: {
      paymentTerms: contract.paymentTerms || "Cash",
      deliveryAddress: contract.deliveryAddress || order.factoryName || "-",
      qualityRemarks: contract.qualityRemarks || "-",
    },
  };

  return (
    <PrintablePOPage
      poData={poData}
      backHref={`/contracts/${encodeURIComponent(contract.id)}`}
    />
  );
}
