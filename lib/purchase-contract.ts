import { promises as fs } from "node:fs";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PurchaseContractPdfInput = {
  poNumber: string;
  signedDate: string; // YYYY-MM-DD
  sku: string;
  productName: string;
  batch: string;
  quantity: number;
  unitCost: number;
  total: number;
  deliveryDate: string; // YYYY-MM-DD
  serialCode: string;
  bluetoothId: string;
};

function formatDateCN(input: string) {
  // input: YYYY-MM-DD -> YYYY/M/D
  const [y, m, d] = input.split("-").map((x) => Number(x));
  if (!y || !m || !d) return input;
  return `${y}/${m}/${d}`;
}

function padText(value: string, maxLen = 200) {
  return String(value ?? "").slice(0, maxLen);
}

export async function generatePurchaseContractPdf(input: PurchaseContractPdfInput) {
  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    "purchase-contract-template.pdf",
  );
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const page = pages[0];

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0.1, 0.1, 0.1);

  // Note: Coordinates are tuned by eyeballing A4 defaults; adjust after first user feedback.
  // pdf-lib uses bottom-left origin.
  const yTopLine = 770;
  page.drawText(padText(input.poNumber), {
    x: 150,
    y: yTopLine,
    size: 11,
    font: fontBold,
    color: black,
  });
  page.drawText(formatDateCN(input.signedDate), {
    x: 360,
    y: yTopLine,
    size: 11,
    font,
    color: black,
  });

  // Table row
  const yRow = 595;
  page.drawText(padText(input.sku), { x: 78, y: yRow, size: 10.5, font, color: black });
  page.drawText(padText(input.productName), { x: 135, y: yRow, size: 10.5, font, color: black });
  page.drawText(padText(input.batch), { x: 245, y: yRow, size: 10.5, font, color: black });
  page.drawText("个", { x: 295, y: yRow, size: 10.5, font, color: black });
  page.drawText(String(input.quantity), { x: 325, y: yRow, size: 10.5, font, color: black });

  page.drawText(`￥${input.unitCost.toFixed(2)}`, {
    x: 370,
    y: yRow,
    size: 10.5,
    font,
    color: black,
  });
  page.drawText(formatDateCN(input.deliveryDate), {
    x: 470,
    y: yRow,
    size: 10.5,
    font,
    color: black,
  });

  // Total lines (TOL)
  const yTol = 575;
  page.drawText(`￥${input.total.toFixed(2)}`, {
    x: 130,
    y: yTol,
    size: 11,
    font: fontBold,
    color: black,
  });

  // Notes area
  const ySerial = 502;
  page.drawText(padText(input.serialCode), { x: 100, y: ySerial, size: 10.5, font, color: black });
  const yBt = 482;
  page.drawText(padText(input.bluetoothId), { x: 100, y: yBt, size: 10.5, font, color: black });

  const bytes = await pdfDoc.save();
  return bytes;
}

