"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DeleteProofButton } from "@/components/delete-proof-button";

type Proof = {
  id: string;
  name: string | null;
  conclusion: string;
  rules: string;
  premises: string | null;
  lines: Array<{ id: string; lineNo: string; formula: string | null; rule: string | null; depth?: number; refs?: string[] }>;
};

export default function ProofDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const [proof, setProof] = useState<Proof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [proofId, setProofId] = useState<string | null>(null);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setProofId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (!proofId) return;
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setError("Please sign in to view this proof");
      setLoading(false);
      return;
    }

    const fetchProof = async () => {
      try {
        const res = await fetch(`/api/proofs?id=${proofId}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 403) {
            setError("You don't have permission to view this proof");
          } else if (res.status === 404) {
            setError("Proof not found");
          } else {
            setError("Failed to load proof");
          }
          return;
        }
        const data = await res.json();
        setProof(data?.item ?? null);
      } catch (err) {
        setError("Failed to load proof");
      } finally {
        setLoading(false);
      }
    };

    fetchProof();
  }, [proofId, status]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-6 py-10">Loading...</div>;
  }

  if (!proof) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">{error || "Proof not found"}</p>
          <a href="/proofs" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
            Back to Proofs
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{proof.name ?? `Proof ${proof.id.slice(0, 6)}`}</h1>
          <div className="text-sm text-muted-foreground">Rules: {proof.rules}</div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/proofs/${proof.id}/edit`} className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Edit</a>
          <DeleteProofButton proofId={proof.id} proofName={proof.name} />
          <a href="/proofs" className="inline-flex items-center rounded-md px-3 py-1.5 text-sm hover:bg-accent">Back</a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Premises</div>
          <div className="text-sm">{proof.premises || "—"}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Conclusion</div>
          <div className="text-sm">{proof.conclusion}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">ID</div>
          <div className="text-sm">{proof.id}</div>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 w-20">#</th>
              <th className="text-left p-3 w-24">Subproof</th>
              <th className="text-left p-3">Formula</th>
              <th className="text-left p-3 w-64">Rule</th>
              <th className="text-left p-3 w-40">Refs</th>
            </tr>
          </thead>
          <tbody>
            {proof.lines.map((l, i) => (
              <tr key={l.id} className="border-b last:border-0 align-top">
                <td className="p-3">{l.lineNo}</td>
                <td className="p-3">
                  {(() => {
                    const depth = Number(l.depth ?? 0);
                    const prevDepth = i > 0 ? Number(proof.lines[i-1]?.depth ?? 0) : 0;
                    const nextDepth = i < proof.lines.length - 1 ? Number(proof.lines[i+1]?.depth ?? depth) : depth;
                    let brace = "";
                    if (depth > prevDepth) brace = "⎧";
                    else if (nextDepth < depth) brace = "⎭";
                    else if (depth > 0) brace = "│";
                    return <span className="font-mono text-xs w-3 text-muted-foreground inline-block text-center">{brace}</span>;
                  })()}
                  <span className="text-xs text-muted-foreground ml-1">{Number(l.depth ?? 0)}</span>
                </td>
                <td className="p-3 whitespace-pre">{" ".repeat(Number(l.depth ?? 0) * 2)}{l.formula ?? ""}</td>
                <td className="p-3">{l.rule ?? ""}</td>
                <td className="p-3">{(l.refs ?? []).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


