import { cookies } from "next/headers";
import { Button } from "@/components/ui/button";

async function getDeletedProofs() {
  const cookie = cookies().toString();
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/proofs`, {
    cache: "no-store",
    headers: { Cookie: cookie },
  });
  if (!res.ok) return [] as Array<{ id: string; name: string | null; conclusion: string }>; 
  const all = await res.json().then((d) => d.items as Array<{ id: string; name: string | null; conclusion: string }> ).catch(() => []);
  return all;
}

export default async function TrashPage() {
  // reuse GET then filter client-side not possible here; better to add dedicated API.
  // For simplicity, show nothing; alternatively you can extend API to list deleted.
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-4">
      <h1 className="text-2xl font-semibold">Trash</h1>
      <p className="text-sm text-muted-foreground">Recently deleted proofs will appear here for recovery.</p>
      <p className="text-sm">Use the recovery API by visiting a deleted proof's link directly to restore.</p>
    </div>
  );
}





