import { NextResponse } from "next/server";

import {
  computeForecastContractCoverage,
  formatCoverageToast,
} from "@/lib/contract-forecast-coverage";
import {
  createContractsFromForecast,
  enrichForecastRecordsForCashFlow,
  getForecastsByRegions,
  listContractsBySessionRegions,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const allocations = Array.isArray(body.allocations) ? body.allocations : [];
  const batch = String(body.batch || "").trim();
  const currency = String(body.currency || "USD").trim();
  const remark = String(body.remark ?? "").trim();
  const deliveryAddress = String(body.deliveryAddress || "").trim();
  const serialCode = String(body.serialCode || "").trim();
  const bluetoothId = String(body.bluetoothId || "").trim();
  const language = body.language === "zh" ? "zh" : "en";

  if (!batch || !deliveryAddress || !serialCode || !bluetoothId) {
    return NextResponse.json(
      { message: "Missing required fields (batch, serial code, and Bluetooth ID are required)" },
      { status: 400 },
    );
  }

  try {
    const { contracts } = await createContractsFromForecast({
      allocations: allocations.map((a: { forecastId?: string; supplierName?: string; quantity?: number }) => ({
        forecastId: String(a.forecastId || ""),
        supplierName: String(a.supplierName || ""),
        quantity: Number(a.quantity) || 0,
      })),
      batch,
      currency,
      remark,
      deliveryAddress,
      serialCode,
      bluetoothId,
      createdBy: session.username,
      sessionRegions: session.regions,
    });

    const forecasts = await getForecastsByRegions(session.regions);
    const fcRows = await enrichForecastRecordsForCashFlow(forecasts);
    const allContracts = await listContractsBySessionRegions(session.regions);
    const coverage = computeForecastContractCoverage(fcRows, allContracts);
    const toast = formatCoverageToast(coverage, language);

    return NextResponse.json({ ok: true, contracts, coverage, toast });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create contract failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
