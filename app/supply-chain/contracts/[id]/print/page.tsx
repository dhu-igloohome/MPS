import { notFound, redirect } from "next/navigation";

import { PrintablePOPage } from "@/components/contract/printable-po-page";
import { buildPrintablePODataForContract } from "@/lib/printable-po-data";
import { getContractById, sessionCanAccessContract } from "@/lib/repositories";
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
  const poData = await buildPrintablePODataForContract(contract, session.username);

  return (
    <PrintablePOPage
      poData={poData}
      backHref={`/supply-chain/contracts/${encodeURIComponent(contract.id)}`}
    />
  );
}

