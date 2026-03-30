import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/supply-chain/contracts/${encodeURIComponent(id)}`);
}
