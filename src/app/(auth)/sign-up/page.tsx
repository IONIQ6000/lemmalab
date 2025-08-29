"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Create an account</h1>
          <p className="text-sm text-muted-foreground">Join LemmaLab and start building proofs.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" placeholder="yourname" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch("/api/register", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, username, password }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  toast.error(data?.error ?? "Registration failed");
                  return;
                }
                toast.success("Account created. You can now sign in.");
                router.push("/sign-in");
              } catch {
                toast.error("Network error");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Creating..." : "Create account"}
          </Button>
          <div className="text-sm text-muted-foreground">
            Already have an account? <a className="underline" href="/sign-in">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}


