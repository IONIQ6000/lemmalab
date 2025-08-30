import Link from "next/link";
import { NewProofButton } from "@/components/NewProofButton";
import { Logo } from "@/components/logo";
import { ArrowRight, Keyboard, Layers, ShieldCheck, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-12 sm:py-16 space-y-12 sm:space-y-16">
        {/* Hero */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="inline-flex h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 items-center justify-center rounded-md border">
              <Logo className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20" />
            </span>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-semibold tracking-tight">LemmaLab</h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">A clean, distraction‑free proof editor.</p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Write formal proofs without wrestling the UI. LemmaLab stays out of your way and gives quick, accurate feedback as you go.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <NewProofButton className="inline-flex items-center gap-2" variant="default" data-new-proof-btn>
              New proof <ArrowRight className="h-4 w-4" />
            </NewProofButton>
            <Link
              href="/proofs"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 hover:bg-accent"
            >
              View proofs
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2 text-sm font-medium mb-2"><Sparkles className="h-4 w-4" /> Easy editing</div>
            <p className="text-sm text-muted-foreground">
              Inline key legend, click‑to‑insert symbols, and smart ref pickers keep you moving. Shortcuts for save and validate are built in.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2 text-sm font-medium mb-2"><Layers className="h-4 w-4" /> Subproof friendly</div>
            <p className="text-sm text-muted-foreground">
              Simple parentheses controls and live braces make structure clear. Rules like → Intro, ¬ Intro, and IP respect subproof context.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-2 text-sm font-medium mb-2"><ShieldCheck className="h-4 w-4" /> Fast, reliable checks</div>
            <p className="text-sm text-muted-foreground">
              AST‑based checks for TFL and FOL run in a web worker, so results feel instant.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-xl border p-6 bg-card">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <li className="rounded-lg border p-4">
              <div className="text-sm font-medium mb-1">1. Sketch your proof</div>
              <p className="text-sm text-muted-foreground">Add lines, choose rules, and pick references in a click.</p>
            </li>
            <li className="rounded-lg border p-4">
              <div className="text-sm font-medium mb-1">2. Validate as you go</div>
              <p className="text-sm text-muted-foreground">Press ⌘/Ctrl+Enter to validate; issues show up right next to your work.</p>
            </li>
            <li className="rounded-lg border p-4">
              <div className="text-sm font-medium mb-1">3. Save or share</div>
              <p className="text-sm text-muted-foreground">Auto‑save protects your draft. Export a readable view or save it to your list.</p>
            </li>
          </ol>
          <div className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-2"><Keyboard className="h-3.5 w-3.5" /> Shortcuts: ⌘/Ctrl+S to save, ⌘/Ctrl+Enter to validate</div>
        </section>
      </main>
    </div>
  );
}
