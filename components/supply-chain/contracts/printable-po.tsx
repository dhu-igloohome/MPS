"use client";

import Image from "next/image";

export type PrintablePOLineItem = {
  index: number;
  materialCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: string;
  remark: string;
};

export type PrintablePOData = {
  header: {
    companyName: string;
    poNumber: string;
    date: string;
  };
  /** Optional identifiers shown on the printed PO (below totals). */
  serialCode?: string;
  bluetoothId?: string;
  buyerInfo: {
    name: string;
    contact: string;
    phone: string;
    address: string;
  };
  vendorInfo: {
    name: string;
    contact: string;
    phone: string;
    address?: string;
  };
  lineItems: PrintablePOLineItem[];
  summary: {
    totalAmount: number;
    currency: string;
  };
  terms: {
    paymentTerms: string;
    deliveryAddress: string;
    remark: string;
  };
};

type PrintablePOProps = {
  poData: PrintablePOData;
};

function money(currency: string, amount: number) {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

export function PrintablePO({ poData }: PrintablePOProps) {
  const serial = (poData.serialCode ?? "").trim();
  const bluetooth = (poData.bluetoothId ?? "").trim();

  const vendorAddress = (poData.vendorInfo.address ?? "").trim();

  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-6 text-sm text-black shadow print:m-0 print:max-w-none print:bg-white print:p-0 print:shadow-none">
      <header className="mb-4 flex items-start justify-between border-b border-gray-800 pb-3">
        <div className="flex items-start">
          <Image
            src="/igloo-logo-pinge.svg"
            alt="igloo"
            width={110}
            height={32}
            priority
            className="h-8 w-auto"
          />
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">采购订单 Purchase Order</p>
          <p className="mt-1">PO No: {poData.header.poNumber}</p>
          <p>Date: {poData.header.date}</p>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded border border-gray-800 p-3">
          <p className="mb-1 text-xs font-semibold">供方 (Vendor)</p>
          <p className="break-words font-medium">{poData.vendorInfo.name || "-"}</p>
          <p>联系人 Contact: {poData.vendorInfo.contact || "-"}</p>
          <p>电话 Phone: {poData.vendorInfo.phone || "-"}</p>
          {vendorAddress ? <p className="break-words">地址 Address: {vendorAddress}</p> : null}
        </div>
        <div className="rounded border border-gray-800 p-3">
          <p className="mb-1 text-xs font-semibold">需方 (Buyer)</p>
          <p className="break-words font-medium">{poData.buyerInfo.name || "-"}</p>
          <p>联系人 Contact: {poData.buyerInfo.contact || "-"}</p>
          <p>电话 Phone: {poData.buyerInfo.phone || "-"}</p>
          <p className="break-words">地址 Address: {poData.buyerInfo.address || "-"}</p>
        </div>
      </section>

      <section className="mb-4 overflow-x-hidden">
        <table className="w-full table-fixed border-collapse border border-gray-800 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="w-[6%] border border-gray-800 px-1 py-2 text-center">序号</th>
              <th className="w-[14%] border border-gray-800 px-1 py-2 text-center">物料编码</th>
              <th className="w-[22%] border border-gray-800 px-1 py-2 text-center">品名及规格</th>
              <th className="w-[7%] border border-gray-800 px-1 py-2 text-center">单位</th>
              <th className="w-[9%] border border-gray-800 px-1 py-2 text-center">订单数量</th>
              <th className="w-[12%] border border-gray-800 px-1 py-2 text-center">含税单价</th>
              <th className="w-[12%] border border-gray-800 px-1 py-2 text-center">含税金额</th>
              <th className="w-[11%] border border-gray-800 px-1 py-2 text-center">交货日期</th>
              <th className="w-[7%] border border-gray-800 px-1 py-2 text-center">备注</th>
            </tr>
          </thead>
          <tbody>
            {poData.lineItems.map((item) => (
              <tr key={`${item.materialCode}-${item.index}`}>
                <td className="border border-gray-800 px-1 py-2 text-center">{item.index}</td>
                <td className="break-all border border-gray-800 px-1 py-2">{item.materialCode}</td>
                <td className="break-words border border-gray-800 px-1 py-2">{item.description}</td>
                <td className="border border-gray-800 px-1 py-2 text-center">{item.unit}</td>
                <td className="border border-gray-800 px-1 py-2 text-right">{item.quantity}</td>
                <td className="border border-gray-800 px-1 py-2 text-right">
                  {money(poData.summary.currency, item.unitPrice)}
                </td>
                <td className="border border-gray-800 px-1 py-2 text-right">
                  {money(poData.summary.currency, item.totalPrice)}
                </td>
                <td className="border border-gray-800 px-1 py-2 text-center">{item.deliveryDate}</td>
                <td className="break-words border border-gray-800 px-1 py-2">{item.remark || "-"}</td>
              </tr>
            ))}
            <tr>
              <td className="border border-gray-800 px-1 py-2 text-right font-semibold" colSpan={6}>
                合计金额 Total Amount
              </td>
              <td className="border border-gray-800 px-1 py-2 text-right font-semibold">
                {money(poData.summary.currency, poData.summary.totalAmount)}
              </td>
              <td className="border border-gray-800 px-1 py-2" colSpan={2} />
            </tr>
            <tr>
              <td className="border border-gray-800 px-2 py-2 align-top" colSpan={4}>
                <span className="font-semibold">Serial code 序列号</span>
                <span className="mx-1">:</span>
                <span className="break-words">{serial || "—"}</span>
              </td>
              <td className="border border-gray-800 px-2 py-2 align-top" colSpan={5}>
                <span className="font-semibold">Bluetooth ID 蓝牙 ID</span>
                <span className="mx-1">:</span>
                <span className="break-words">{bluetooth || "—"}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-8 rounded border border-gray-800 p-3">
        <p className="mb-1 text-xs font-semibold">Terms & Remarks</p>
        <p>付款方式 Payment Terms: {poData.terms.paymentTerms || "-"}</p>
        <p className="break-words">收货地址 Delivery Address: {poData.terms.deliveryAddress || "-"}</p>
        <p className="mb-0.5">备注 Remark:</p>
        <p className="whitespace-pre-line break-words">{poData.terms.remark || "-"}</p>
      </section>

      <section className="mt-12 grid grid-cols-2 gap-12">
        <div>
          <div className="mt-12 border-t border-gray-800 pt-2 text-sm">
            供方签章 (Vendor Signature/Stamp)
          </div>
        </div>
        <div>
          <div className="mt-12 border-t border-gray-800 pt-2 text-sm">
            需方签章 (Buyer Signature/Stamp)
          </div>
        </div>
      </section>
    </div>
  );
}
