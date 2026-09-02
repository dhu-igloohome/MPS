import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { PrintablePOData } from "@/components/supply-chain/contracts/printable-po";

let fontRegistered = false;
function ensureFontRegistered() {
  if (fontRegistered) return;
  Font.register({
    family: "NotoSansSC",
    src: path.join(process.cwd(), "public/fonts/NotoSansSC-VF.ttf"),
  });
  fontRegistered = true;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansSC",
    fontSize: 9,
    padding: 28,
    color: "#111111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    paddingBottom: 8,
    marginBottom: 12,
  },
  logo: { fontSize: 16, fontWeight: 700, color: "#EE6454" },
  headerRight: { alignItems: "flex-end" },
  titleText: { fontSize: 14, fontWeight: 700 },
  infoRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  infoBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 8,
  },
  infoLabel: { fontSize: 8, fontWeight: 700, marginBottom: 3 },
  infoLine: { marginBottom: 1 },
  table: { borderWidth: 1, borderColor: "#1f2937", marginBottom: 12 },
  tableRow: { flexDirection: "row" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f3f4f6" },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1f2937",
    padding: 4,
    justifyContent: "center",
  },
  cellLast: {
    borderBottomWidth: 1,
    borderColor: "#1f2937",
    padding: 4,
    justifyContent: "center",
  },
  cellCenter: { textAlign: "center" },
  cellRight: { textAlign: "right" },
  termsBox: { borderWidth: 1, borderColor: "#1f2937", padding: 8, marginBottom: 28 },
  termsLabel: { fontSize: 8, fontWeight: 700, marginBottom: 3 },
  signatureRow: { flexDirection: "row", gap: 40, marginTop: 12 },
  signatureBox: { flex: 1, borderTopWidth: 1, borderTopColor: "#1f2937", paddingTop: 6 },
});

const COL = {
  index: "6%",
  material: "14%",
  desc: "22%",
  unit: "7%",
  qty: "9%",
  unitPrice: "12%",
  total: "12%",
  delivery: "11%",
  remark: "7%",
} as const;

function money(currency: string, amount: number) {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function PrintablePODocument({ poData }: { poData: PrintablePOData }) {
  const serial = (poData.serialCode ?? "").trim();
  const bluetooth = (poData.bluetoothId ?? "").trim();
  const vendorAddress = (poData.vendorInfo.address ?? "").trim();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>igloo</Text>
          <View style={styles.headerRight}>
            <Text style={styles.titleText}>采购订单 Purchase Order</Text>
            <Text>PO No: {poData.header.poNumber}</Text>
            <Text>Date: {poData.header.date}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>供方 (Vendor)</Text>
            <Text style={styles.infoLine}>{poData.vendorInfo.name || "-"}</Text>
            <Text style={styles.infoLine}>联系人 Contact: {poData.vendorInfo.contact || "-"}</Text>
            <Text style={styles.infoLine}>电话 Phone: {poData.vendorInfo.phone || "-"}</Text>
            {vendorAddress ? <Text style={styles.infoLine}>地址 Address: {vendorAddress}</Text> : null}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>需方 (Buyer)</Text>
            <Text style={styles.infoLine}>{poData.buyerInfo.name || "-"}</Text>
            <Text style={styles.infoLine}>联系人 Contact: {poData.buyerInfo.contact || "-"}</Text>
            <Text style={styles.infoLine}>电话 Phone: {poData.buyerInfo.phone || "-"}</Text>
            <Text style={styles.infoLine}>地址 Address: {poData.buyerInfo.address || "-"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.cell, styles.cellCenter, { width: COL.index }]}>序号</Text>
            <Text style={[styles.cell, styles.cellCenter, { width: COL.material }]}>物料编码</Text>
            <Text style={[styles.cell, styles.cellCenter, { width: COL.desc }]}>品名及规格</Text>
            <Text style={[styles.cell, styles.cellCenter, { width: COL.unit }]}>单位</Text>
            <Text style={[styles.cell, styles.cellCenter, { width: COL.qty }]}>订单数量</Text>
            <Text style={[styles.cell, styles.cellCenter, { width: COL.unitPrice }]}>含税单价</Text>
            <Text style={[styles.cell, styles.cellCenter, { width: COL.total }]}>含税金额</Text>
            <Text style={[styles.cell, styles.cellCenter, { width: COL.delivery }]}>交货日期</Text>
            <Text style={[styles.cellLast, styles.cellCenter, { width: COL.remark }]}>备注</Text>
          </View>
          {poData.lineItems.map((item) => (
            <View style={styles.tableRow} key={`${item.materialCode}-${item.index}`}>
              <Text style={[styles.cell, styles.cellCenter, { width: COL.index }]}>{item.index}</Text>
              <Text style={[styles.cell, { width: COL.material }]}>{item.materialCode}</Text>
              <Text style={[styles.cell, { width: COL.desc }]}>{item.description}</Text>
              <Text style={[styles.cell, styles.cellCenter, { width: COL.unit }]}>{item.unit}</Text>
              <Text style={[styles.cell, styles.cellRight, { width: COL.qty }]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.cellRight, { width: COL.unitPrice }]}>
                {money(poData.summary.currency, item.unitPrice)}
              </Text>
              <Text style={[styles.cell, styles.cellRight, { width: COL.total }]}>
                {money(poData.summary.currency, item.totalPrice)}
              </Text>
              <Text style={[styles.cell, styles.cellCenter, { width: COL.delivery }]}>{item.deliveryDate}</Text>
              <Text style={[styles.cellLast, { width: COL.remark }]}>{item.remark || "-"}</Text>
            </View>
          ))}
          <View style={styles.tableRow}>
            <Text
              style={[
                styles.cell,
                styles.cellRight,
                { width: "82%", fontWeight: 700 },
              ]}
            >
              合计金额 Total Amount
            </Text>
            <Text style={[styles.cell, styles.cellRight, { width: COL.total, fontWeight: 700 }]}>
              {money(poData.summary.currency, poData.summary.totalAmount)}
            </Text>
            <View style={[styles.cellLast, { width: "18%" }]} />
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.cell, { width: "42%" }]}>
              Serial code 序列号 : {serial || "—"}
            </Text>
            <Text style={[styles.cellLast, { width: "58%" }]}>
              Bluetooth ID 蓝牙 ID : {bluetooth || "—"}
            </Text>
          </View>
        </View>

        <View style={styles.termsBox}>
          <Text style={styles.termsLabel}>Terms & Remarks</Text>
          <Text style={styles.infoLine}>付款方式 Payment Terms: {poData.terms.paymentTerms || "-"}</Text>
          <Text style={styles.infoLine}>收货地址 Delivery Address: {poData.terms.deliveryAddress || "-"}</Text>
          <Text style={styles.infoLine}>备注 Remark:</Text>
          <Text>{poData.terms.remark || "-"}</Text>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text>供方签章 (Vendor Signature/Stamp)</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>需方签章 (Buyer Signature/Stamp)</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderPrintablePOToPdfBuffer(poData: PrintablePOData): Promise<Buffer> {
  ensureFontRegistered();
  return renderToBuffer(<PrintablePODocument poData={poData} />);
}
