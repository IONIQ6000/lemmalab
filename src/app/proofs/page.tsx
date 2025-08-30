import { cookies } from "next/headers";
import { ProofsListClient } from "./ProofsListClient";

async function getProofs() {
  const cookieStore = await cookies();
  const all = (cookieStore as any).getAll?.() as Array<{ name: string; value: string }>;
  const cookieHeader = Array.isArray(all)
    ? all.map((c: { name: string; value: string }) => `${c.name}=${c.value}`).join("; ")
    : "";
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/proofs`, {
    cache: "no-store",
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });
  if (!res.ok) {
    return [] as Array<{ id: string; name: string | null; conclusion: string }>;
  }
  try {
    const data = await res.json();
    return (data?.items ?? []) as Array<{ id: string; name: string | null; conclusion: string }>;
  } catch {
    return [] as Array<{ id: string; name: string | null; conclusion: string }>;
  }
}

async function ProofsList() {
  const items = await getProofs();
  return <ProofsListClient items={items} />
}

export default function ProofsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Your Proofs</h1>
          <p className="text-sm text-muted-foreground">Browse, edit, or start a new proof. Recently updated appear first.</p>
        </div>
        <a className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 border border-primary/60 w-fit" href="/proofs/new">New proof</a>
      </div>
      <ProofsList />
    </div>
  );
}