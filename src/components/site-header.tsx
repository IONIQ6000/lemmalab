"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "next-auth/react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { HelpCircle, Keyboard, BookOpen, Layers, Settings } from "lucide-react";
import { Logo } from "@/components/logo";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const links = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/assignments", label: "Assignments" },
  { href: "/proofs", label: "Proofs" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { status } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
        <Link href="/" className="font-semibold tracking-tight flex items-center gap-3" aria-label="LemmaLab home">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border bg-card">
            <Logo className="h-7 w-7" />
          </span>
          <span className="text-base">LemmaLab</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2 text-sm">
          <TooltipProvider delayDuration={200}>
          {links
            .filter((l) => l.href !== "/courses" && l.href !== "/assignments")
            .map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-full text-muted-foreground transition-colors hover:text-foreground hover:bg-accent",
                pathname === link.href && "text-foreground bg-accent"
              )}
            >
              {link.label}
            </Link>
          ))}
          {/* Rules slide-out (wide, detailed) */}
          <Sheet>
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger aria-label="Rules" className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-accent">
                  <Layers className="h-4 w-4" />
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Rules</TooltipContent>
            </Tooltip>
            <SheetContent side="right" className="w-full sm:w-[38rem] md:w-[44rem]">
              <SheetHeader>
                <SheetTitle className="text-lg">Rules Reference</SheetTitle>
              </SheetHeader>
              <SheetBody>
                <div className="space-y-8 text-sm">
                  <section>
                    <div className="text-base font-semibold">Truth-Functional Logic (TFL)</div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Conjunction Introduction (∧I)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>From A and B infer A ∧ B.</li>
                          <li>Refs required: 2 (lines for A and B).</li>
                          <li>Order matters in UI input; engine checks structurally.</li>
                          <li>Example: A, B ⟹ A ∧ B.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Conjunction Elimination (∧E)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>From A ∧ B infer A (or infer B).</li>
                          <li>Refs required: 1 (the conjunction).</li>
                          <li>Pick either conjunct as the conclusion.</li>
                          <li>Example: A ∧ B ⟹ A.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Conditional Elimination (→E, MP)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>From A and A → B infer B.</li>
                          <li>Refs required: 2 (premise A, conditional A → B).</li>
                          <li>Order of refs not important.</li>
                          <li>Example: A, A → B ⟹ B.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Modus Tollens (MT)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>From A → B and ¬B infer ¬A.</li>
                          <li>Refs required: 2 (conditional and the negated consequent).</li>
                          <li>Example: A → B, ¬B ⟹ ¬A.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Biconditional Introduction (↔I)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>From A → B and B → A infer A ↔ B.</li>
                          <li>Refs required: 2 (both directionals).</li>
                          <li>Example: A → B, B → A ⟹ A ↔ B.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Biconditional Elimination (↔E)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>From A ↔ B and A infer B (or with B infer A).</li>
                          <li>Refs required: 2 (the ↔ and one side).</li>
                          <li>Example: A ↔ B, A ⟹ B.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Negation Introduction (¬I)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>Assume A, derive a contradiction within the subproof, conclude ¬A.</li>
                          <li>Refs: any lines that witness the contradiction inside the subproof.</li>
                          <li>Engine checks for X and ¬X or (X ∧ ¬X) inside the frame.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Conditional Introduction (→I)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>Assume A, derive B within the subproof, conclude A → B (discharge assumption).</li>
                          <li>Refs required: 2: [assumption line, derived line in frame].</li>
                          <li>Engine enforces frame containment and A matching the antecedent.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Indirect Proof (IP)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>Assume ¬A, derive a contradiction within the subproof, conclude A.</li>
                          <li>Refs: any lines that witness the contradiction inside the frame.</li>
                          <li>Engine checks structural contradiction analogously to ¬I.</li>
                        </ul>
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className="text-base font-semibold">First-Order Logic (FOL)</div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Universal Introduction (∀I)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>From P(x) infer ∀x P(x) (with usual restrictions on x not being special).</li>
                          <li>Refs required: 1 (an instance of the body).</li>
                          <li>Engine uses alpha-equivalence on bound variable names.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Universal Elimination (∀E)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>From ∀x P(x) infer P(t).</li>
                          <li>Refs required: 1 (the universal statement).</li>
                          <li>Engine performs a capture-avoiding substitution heuristic.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Existential Introduction (∃I)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>From P(t) infer ∃x P(x).</li>
                          <li>Refs required: 1 (the instance).</li>
                          <li>Engine checks instance matches the body up to renaming.</li>
                        </ul>
                      </div>
                      <div className="rounded-md border p-4">
                        <div className="font-medium">Existential Elimination (∃E)</div>
                        <ul className="mt-1 text-muted-foreground list-disc ml-5 space-y-1">
                          <li>From ∃x P(x) and subproof P(c) ⟹ Q, infer Q (with standard restrictions).</li>
                          <li>Refs: 1 for ∃ premise plus subproof lines for the derivation of Q.</li>
                          <li>Note: full checking of restrictions is in progress.</li>
                        </ul>
                      </div>
                    </div>
                  </section>
                </div>
              </SheetBody>
            </SheetContent>
          </Sheet>
          <Sheet>
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger aria-label="Help" className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-accent">
                  <HelpCircle className="h-4 w-4" />
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Help</TooltipContent>
            </Tooltip>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="text-lg">Help & Tips</SheetTitle>
              </SheetHeader>
              <SheetBody>
                <div className="space-y-6 text-sm">
                  <section>
                    <div className="flex items-center gap-2 font-semibold"><HelpCircle className="h-4 w-4" /> Getting Started</div>
                    <p className="text-muted-foreground mt-1">Create a new proof from Proofs. Use the legend for quick symbols and the right-side ref picker to link prior lines.</p>
                  </section>
                  <section>
                    <div className="flex items-center gap-2 font-semibold"><Keyboard className="h-4 w-4" /> Keyboard Shortcuts</div>
                    <ul className="mt-1 list-disc ml-5 space-y-1 text-muted-foreground">
                      <li>Cmd/Ctrl + S: Save</li>
                      <li>Cmd/Ctrl + Enter: Validate</li>
                      <li>Click symbols in the legend to insert at cursor</li>
                    </ul>
                  </section>
                  <section>
                    <div className="flex items-center gap-2 font-semibold"><Layers className="h-4 w-4" /> Subproofs</div>
                    <p className="text-muted-foreground mt-1">Use ( and ) controls to start/end subproofs. The engine enforces →Intro, ¬Intro, and IP with subproof context.</p>
                  </section>
                  <section>
                    <div className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4" /> Rules</div>
                    <p className="text-muted-foreground mt-1">Rule pickers show required refs. Use the inline picker to select valid lines; the list is filtered to the current frame.</p>
                  </section>
                  <section>
                    <div className="flex items-center gap-2 font-semibold"><Settings className="h-4 w-4" /> Auto-save</div>
                    <p className="text-muted-foreground mt-1">Enable Auto-save to sync drafts after a brief pause. Name is required to save.</p>
                  </section>
                </div>
              </SheetBody>
            </SheetContent>
          </Sheet>
          <div className="ml-1 pl-2 border-l flex items-center gap-2">
            {status === "authenticated" ? (
              <button 
                className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign out
              </button>
            ) : (
              <Link 
                href="/sign-in" 
                className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Sign in
              </Link>
            )}
          </div>
          </TooltipProvider>
        </nav>
      </div>
    </header>
  );
}


