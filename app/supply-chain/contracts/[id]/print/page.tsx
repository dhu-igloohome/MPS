import { notFound, redirect } from "next/navigation";

import { PrintablePOPage } from "@/components/contract/printable-po-page";
import type { PrintablePOData } from "@/components/contract/printable-po";
import { getContractBuyerEntity } from "@/lib/contract-buyer-entities";
import {
  getContractById,
  getOrderProgressById,
  listSuppliers,
  sessionCanAccessContract,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function SupplyChainContractPrintPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const contract = await getContractById(id);
  if (!contract) notFound();
  if (!(contract.status === "approved" || contract.status === "sent")) {
    notFound();
  }

  if (!(await sessionCanAccessContract(session.regions, contract))) {
    notFound();
  }
  const [order, suppliers] = await Promise.all([
    contract.orderProgressId ? getOrderProgressById(contract.orderProgressId) : Promise.resolve(null),
    listSuppliers(),
  ]);
  const supplier = suppliers.find((item) => item.id === contract.supplierId);
  const buyer = getContractBuyerEntity(
    contract.buyerEntityCode === "singapore" ? "singapore" : "shenzhen",
  );
  const poData: PrintablePOData = {
    header: {
      companyName: buyer.legalName,
      poNumber: contract.poNumber,
      date: contract.signedDate || contract.createdAt?.slice(0, 10) || "-",
    },
    serialCode: contract.serialCode,
    bluetoothId: contract.bluetoothId,
    buyerInfo: {
      name: buyer.legalName,
      contact: session.username || "-",
      phone: "-",
      address: buyer.address,
    },
    vendorInfo: {
      name: contract.supplierName || supplier?.name || "-",
      contact: supplier?.contactName || "-",
      phone: supplier?.contactPhone || "-",
      address: supplier?.address || "-",
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
      deliveryAddress: contract.deliveryAddress || order?.factoryName || "-",
      remark: contract.remark || "-",
    },
  };

  return (
    <PrintablePOPage
      poData={poData}
      backHref={`/supply-chain/contracts/${encodeURIComponent(contract.id)}`}
    />
  );
}

