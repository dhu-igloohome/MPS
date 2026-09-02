import type { PrintablePOData } from "@/components/supply-chain/contracts/printable-po";
import { getContractBuyerEntity } from "@/lib/contract-buyer-entities";
import {
  getBuyerEntityByCode,
  getOrderProgressById,
  listContractsByPoNumberGlobal,
  listSuppliers,
} from "@/lib/repositories";
import type { ContractEntry } from "@/lib/types";

/**
 * Supplier-facing PO number: when one PO number covers multiple SKUs (multiple contracts), each
 * gets a "-001", "-002", ... suffix (in the order the contracts were created) so suppliers can
 * tell otherwise-identical PO documents apart. Does NOT touch the stored `contracts.po_number` —
 * every internal flow (forecasts, cash flow, integration API, filters) keeps using the real
 * value; this is purely a display/filename computation for the printed/downloaded document.
 * Single-SKU POs (the common case) are unaffected — no suffix is added.
 */
export async function resolvePrintablePONumber(contract: ContractEntry): Promise<string> {
  const siblings = await listContractsByPoNumberGlobal(contract.poNumber);
  if (siblings.length <= 1) return contract.poNumber;
  const index = siblings.findIndex((c) => c.id === contract.id);
  const seq = index >= 0 ? index + 1 : 1;
  return `${contract.poNumber}-${String(seq).padStart(3, "0")}`;
}

/** Shared by the HTML print page and the PDF download route so both render identical data. */
export async function buildPrintablePODataForContract(
  contract: ContractEntry,
  sessionUsername: string,
  displayPoNumber?: string,
): Promise<PrintablePOData> {
  const [order, suppliers] = await Promise.all([
    contract.orderProgressId ? getOrderProgressById(contract.orderProgressId) : Promise.resolve(null),
    listSuppliers(),
  ]);
  const supplier = suppliers.find((item) => item.id === contract.supplierId);
  const buyerCode = contract.buyerEntityCode === "singapore" ? "singapore" : "shenzhen";
  const buyerDb = await getBuyerEntityByCode(buyerCode);
  const buyerFallback = getContractBuyerEntity(buyerCode);
  const buyer = buyerDb?.isActive ? buyerDb : buyerFallback;

  return {
    header: {
      companyName: buyer.legalName,
      poNumber: displayPoNumber ?? contract.poNumber,
      date: contract.signedDate || contract.createdAt?.slice(0, 10) || "-",
    },
    serialCode: contract.serialCode,
    bluetoothId: contract.bluetoothId,
    buyerInfo: {
      name: buyer.legalName,
      contact: buyerDb?.contactName?.trim() || sessionUsername || "-",
      phone: buyerDb?.contactPhone?.trim() || "-",
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
}

/** Sanitized, filesystem-safe PDF filename for a contract's PO. */
export function printablePOFileName(contract: ContractEntry, displayPoNumber?: string): string {
  const safe = (s: string) => s.trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  const po = safe(displayPoNumber ?? contract.poNumber) || `contract-${contract.id}`;
  const sku = safe(contract.sku);
  return sku ? `PO_${po}_${sku}.pdf` : `PO_${po}.pdf`;
}
