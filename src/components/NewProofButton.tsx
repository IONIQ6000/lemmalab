"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface NewProofButtonProps {
  children?: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}

export function NewProofButton({ children = "New proof", className, variant, size }: NewProofButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function createProof() {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name,
        rules: "tfl_basic",
        premises: [],
        conclusion: "",
        lines: [],
        skipValidation: true,
      } as const;
      const res = await fetch("/api/proofs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Please sign in to create proofs");
          window.location.href = "/sign-in?callbackUrl=/proofs";
          return;
        }
        const err = await res.json().catch(() => ({} as any));
        toast.error(err?.error ?? "Failed to create proof");
        return;
      }
      const data = await res.json();
      const id = data?.item?.id as string | undefined;
      if (!id) {
        toast.error("Invalid response from server");
        return;
      }
      setOpen(false);
      window.location.href = `/proofs/${id}/edit`;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button className={className} variant={variant} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new proof</DialogTitle>
            <DialogDescription>Enter a name for your proof. You can edit details later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm">Name</label>
            <Input autoFocus placeholder="Untitled proof" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={createProof} disabled={submitting}>{submitting ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


