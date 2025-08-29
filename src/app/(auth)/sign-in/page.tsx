"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue to LemmaLab.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email or username</Label>
            <Input id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button
            className="w-full"
            onClick={async () => {
              const res = await signIn("credentials", { email, password, redirect: false });
              if (res?.error) {
                toast.error("Invalid email/username or password");
                return;
              }
              window.location.href = "/";
            }}
          >
            Continue
          </Button>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              No account? <a className="underline" href="/sign-up">Create one</a>
            </span>
            <a className="underline" href="#">Forgot password</a>
          </div>
        </div>
      </div>
    </div>
  );
}


