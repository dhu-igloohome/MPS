import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ poNumber: string }> };

export const dynamic = "force-dynamic";

export default async function ContractBatchPrintByPoPage({ params }: PageProps) {
  const { poNumber } = await params;
  redirect(`/supply-chain/contracts/po/${encodeURIComponent(poNumber)}/print`);
}
