"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, RotateCcw, ChevronDown, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { KeyLegend } from "@/components/key-legend";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Line = { lineNo: string; formula: string; rule?: string; refs: string[]; depth: number };

function getRefCount(rule?: string): number {
  const r = (rule ?? "").toLowerCase();
  if (!r || r.includes("premise")) return 0;
  if (r.includes("reiteration")) return 1;
  if (r.includes("conjunction intro")) return 2;
  if (r.includes("conjunction elim")) return 1;
  if (r.includes("conditional elim") || r.includes("modus ponens") || /\bmp\b/.test(r)) return 2;
  if (r.includes("modus tollens") || /\bmt\b/.test(r)) return 2;
  if (r.includes("disjunction intro")) return 1;
  if (r.includes("double negation intro")) return 1;
  if (r.includes("double negation elim")) return 1;
  if (r.includes("biconditional intro")) return 2;
  if (r.includes("biconditional elim")) return 2;
  if (r.includes("disjunction elim")) return 3;
  if (r.includes("negation intro")) return 2;
  if (r.includes("de morgan")) return 1;
  if (r.includes("explosion")) return 1;
  if (r.includes("conditional intro")) return 2;
  if (r.includes("negation elim")) return 1;
  if (r.includes("excluded middle")) return 0;
  if (r.includes("disjunctive syllogism") || /\bds\b/.test(r)) return 2;
  if (r.includes("indirect proof") || /\bip\b/.test(r)) return 1;
  if (r.includes("equality intro")) return 0;
  if (r.includes("equality elim")) return 2;
  if (r.includes("universal intro")) return 1;
  if (r.includes("universal elim")) return 1;
  if (r.includes("existential intro")) return 1;
  if (r.includes("existential elim")) return 2;
  if (r.includes("conversion of quantifiers")) return 1;
  return 0;
}

export default function NewProofPage() {
  const { status } = useSession();
  const [name, setName] = useState("");
  const [premises, setPremises] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [lines, setLines] = useState<Line[]>([{ lineNo: "1", formula: "", rule: "", refs: [], depth: 0 }]);
  const [result, setResult] = useState<any>(null);
  const [autoSave, setAutoSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [savedVisible, setSavedVisible] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showReadableDialog, setShowReadableDialog] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingSave, setPendingSave] = useState<(() => void) | null>(null);
  const activeInputRef = useRef<HTMLInputElement>(null);
  const validateBtnRef = useRef<HTMLButtonElement>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const creatingDraftRef = useRef<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);

  const stepCount = lines.length;

  const allRequirementsMet = useMemo(() => {
    return lines.every((l) => {
      const required = getRefCount(l.rule);
      if (!required) return true;
      const refs = l.refs ?? [];
      if (refs.length < required) return false;
      for (let i = 0; i < required; i++) {
        if (!String(refs[i] ?? "").trim()) return false;
      }
      return true;
    });
  }, [lines]);

  useEffect(() => {
    setDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, premises, conclusion, JSON.stringify(lines)]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveBtnRef.current?.click();
      } else if (meta && e.key === "Enter") {
        e.preventDefault();
        validateBtnRef.current?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function insertSymbol(symbol: string) {
    if (activeInputRef.current) {
      const input = activeInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const value = input.value;
      const newValue = value.slice(0, start) + symbol + value.slice(end);
      
      input.value = newValue;
      
      // Trigger change event
      const changeEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(changeEvent);
      
      // Set cursor position after inserted text
      const newPosition = start + symbol.length;
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
    }
  }

  function renumber(next: Line[]): Line[] {
    return next.map((l, i) => ({ ...l, lineNo: String(i + 1) }));
  }

  function addLineAt(index: number) {
    setLines((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, {
        lineNo: String(index + 2),
        formula: "",
        rule: "",
        refs: [],
        depth: prev[index]?.depth ?? 0,
      });
      return renumber(next);
    });
  }

  function deleteLineAt(index: number) {
    setLines((prev) => {
      if (prev.length <= 1) return prev; // keep at least one line
      const next = [...prev];
      next.splice(index, 1);
      return renumber(next);
    });
  }

  // Auto-save: debounce 2s after any edit when active and draftId exists
  useEffect(() => {
    if (!autoSave || !draftId) return;
    if (!name.trim()) return; // Don't auto-save without a name
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const payload = {
          id: draftId,
          name,
          premises: premises.split(",").map((s) => s.trim()).filter(Boolean),
          conclusion,
          lines: lines.map((l) => ({
            lineNo: l.lineNo,
            formula: l.formula,
            rule: l.rule,
            refs: (l.refs ?? []).map((s) => String(s).trim()).filter(Boolean),
            depth: Number(l.depth ?? 0),
          })),
          skipValidation: true,
        };
        await fetch(`/api/proofs?id=${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSavedVisible(true);
        setTimeout(() => setSavedVisible(false), 2500);
        setLastSavedAt(new Date());
        setDirty(false);
      } finally {
        setSaving(false);
      }
    }, 2000);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, draftId, name, premises, conclusion, JSON.stringify(lines)]);

  function pushDepth(index: number) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, depth: Math.min(l.depth + 1, 10) } : l)));
  }

  function pullDepth(index: number) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, depth: Math.max(l.depth - 1, 0) } : l)));
  }

  function resetProof() {
    setLines([{ lineNo: "1", formula: "", rule: "", refs: [], depth: 0 }]);
    setResult(null);
  }

  const validationByLineNo = useMemo(() => {
    const map = new Map<string, { ok: boolean; messages: string[] }>();
    if (result?.lines) {
      for (const l of result.lines as Array<{ lineNo: string; ok: boolean; messages: string[] }>) {
        map.set(String(l.lineNo), { ok: l.ok, messages: l.messages });
      }
    }
    return map;
  }, [result]);

  const issues = useMemo(() => {
    const list: string[] = [];
    lines.forEach((l, idx) => {
      if (!String(l.formula ?? "").trim()) list.push(`#${l.lineNo || idx + 1}: Missing formula`);
      const req = getRefCount(l.rule);
      if (req > 0) {
        const have = (l.refs ?? []).filter((x) => String(x ?? "").trim()).length;
        if (have < req) list.push(`#${l.lineNo || idx + 1}: ${have}/${req} references provided`);
      }
    });
    return list;
  }, [lines]);

  async function performSave(skipValidation = false) {
    if (!name.trim()) {
      toast.error("Please enter a proof name before saving");
      return;
    }
    if (status !== "authenticated") {
      toast.error("Please sign in to save proofs");
      window.location.href = "/sign-in?callbackUrl=/proofs/new";
      return;
    }
    const payload = {
      name,
      premises: premises.split(",").map((s) => s.trim()).filter(Boolean),
      conclusion,
      lines: lines.map((l) => ({
        lineNo: l.lineNo,
        formula: l.formula,
        rule: l.rule,
        refs: (l.refs ?? []).map((s) => String(s).trim()).filter(Boolean),
        depth: Number(l.depth ?? 0),
      })),
      rules: "tfl_basic",
      skipValidation,
    };
    
    if (!skipValidation) {
      const check = await fetch("/api/proof/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let validation: any = { ok: false };
      try {
        validation = await check.json();
      } catch {
        validation = { ok: false };
      }
      if (!validation.ok) {
        setResult(validation);
        setPendingSave(() => () => performSave(true));
        setShowValidationModal(true);
        return;
      }
    }
    
    const save = await fetch("/api/proofs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (save.ok) {
      try {
        const data = await save.json();
        setDirty(false);
        setLastSavedAt(new Date());
        window.location.href = `/proofs/${data.item.id}`;
      } catch {
        toast.warning("Saved, but response was invalid");
      }
    } else if (save.status === 401) {
      toast.error("Please sign in to save proofs");
      window.location.href = "/sign-in?callbackUrl=/proofs/new";
    } else {
      const err = await save.json().catch(() => ({} as any));
      toast.error(err?.error ?? "Save failed");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">New Proof</h1>
      <div className="bg-gradient-to-br from-muted/20 to-muted/10 border rounded-xl p-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Proof Details</h2>
          <p className="text-sm text-muted-foreground">Define the basic information for your logical proof</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Proof Name
            </Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => { activeInputRef.current = e.target; }}
              placeholder="Enter proof name..."
              className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="premises" className="text-sm font-medium text-foreground">
              Premises
            </Label>
            <Input 
              id="premises" 
              value={premises} 
              onChange={(e) => setPremises(e.target.value)}
              onFocus={(e) => { activeInputRef.current = e.target; }}
              placeholder="P, Q, R (comma-separated)"
              className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
            />
            <p className="text-xs text-muted-foreground">Separate multiple premises with commas</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="conclusion" className="text-sm font-medium text-foreground">
              Conclusion
            </Label>
            <Input 
              id="conclusion" 
              value={conclusion} 
              onChange={(e) => setConclusion(e.target.value)}
              onFocus={(e) => { activeInputRef.current = e.target; }}
              placeholder="What you want to prove..."
              className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-muted/20 to-muted/10 border rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Proof Steps</h2>
            <p className="text-sm text-muted-foreground">Build your logical proof step by step</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{stepCount}</span>
            <span>steps</span>
          </div>
        </div>
        <KeyLegend onSymbolInsert={insertSymbol} activeInputRef={activeInputRef} />
        
        <div className="bg-background/50 border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Actions</h3>
              <p className="text-xs text-muted-foreground">Validate, save, export, or manage your proof</p>
              {lastSavedAt && (
                <p className="text-[10px] text-muted-foreground">Last saved {lastSavedAt.toLocaleTimeString()}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Issues" className="relative h-9 w-9">
                    <FileText className="h-4 w-4" />
                    {issues.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] h-4 min-w-4 px-1">
                        {issues.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <div className="text-sm font-medium mb-1">Issues</div>
                  {issues.length ? (
                    <ul className="list-disc ml-5 space-y-1 text-sm">
                      {issues.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-muted-foreground">No issues detected</div>
                  )}
                </PopoverContent>
              </Popover>
              <div className={`transition-opacity duration-700 ease-in-out ${savedVisible ? "opacity-100" : "opacity-0"}`}>
                <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs bg-green-50 text-green-700 border-green-200">
                  <span className="size-2 animate-pulse rounded-full bg-green-500" /> Saved
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setLines((prev) =>
                    renumber([...prev, { lineNo: String(prev.length + 1), formula: "", rule: "", refs: [], depth: 0 }])
                  )
                }
                className="h-9"
              >
                Add Line
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReadableDialog(true)}
                className="h-9"
              >
                Readable View
              </Button>
              <Button
                ref={validateBtnRef}
                onClick={async () => {
                  try {
                    const payload = {
                      name,
                      premises: premises.split(",").map((s) => s.trim()).filter(Boolean),
                      conclusion,
                      lines: lines.map((l) => ({
                        lineNo: l.lineNo,
                        formula: l.formula,
                        rule: l.rule,
                        refs: (l.refs ?? []).map((s) => String(s).trim()).filter(Boolean),
                      })),
                      rules: "tfl_basic",
                    } as const;
                    const w = new Worker(new URL("../../../lib/proofchecker/validator.worker.ts", import.meta.url));
                    const res = await new Promise<any>((resolve) => {
                      w.onmessage = (evt) => resolve(evt.data);
                      w.postMessage({ premises: payload.premises, conclusion: payload.conclusion, lines: payload.lines, rules: payload.rules });
                    });
                    w.terminate();
                    if (!res?.ok) throw new Error(res?.error || "Worker validation failed");
                    const data = res.result;
                    setResult(data);
                    if (!data?.ok) {
                      toast.error("Validation failed");
                    } else {
                      toast.success("Validation passed");
                    }
                  } catch (err) {
                    const res = await fetch("/api/proof/validate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        premises: premises.split(",").map((s) => s.trim()).filter(Boolean),
                        conclusion,
                        lines: lines.map((l) => ({ lineNo: l.lineNo, formula: l.formula, rule: l.rule, refs: (l.refs ?? []).map((s) => String(s).trim()).filter(Boolean), depth: Number(l.depth ?? 0) })),
                        rules: "tfl_basic",
                      }),
                    });
                    try {
                      const data = await res.json();
                      setResult(data);
                      if (!data?.ok) {
                        toast.error("Validation failed");
                      } else {
                        toast.success("Validation passed");
                      }
                    } catch {
                      setResult({ ok: false, error: "Invalid response" });
                      toast.error("Invalid response from server");
                    }
                  }
                }}
                disabled={!allRequirementsMet}
                title={!allRequirementsMet ? "Complete rule references before saving" : undefined}
              >
                Validate
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const text = [
                    `Name: ${name}`,
                    `Premises: ${premises}`,
                    `Conclusion: ${conclusion}`,
                    "Lines:",
                    ...lines.map((l) => `${l.lineNo}\t${" ".repeat(l.depth * 2)}${l.formula}\t${l.rule ?? "Premise"}\t${(l.refs ?? []).join(",")}`),
                  ].join("\n");
                  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${name || "proof"}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <Switch
                    checked={autoSave}
                    onCheckedChange={async (on) => {
                      if (on && !name.trim()) {
                        toast.error("Please enter a proof name before enabling auto-save");
                        return;
                      }
                      setAutoSave(on);
                      if (on && !draftId) {
                        if (creatingDraftRef.current) return;
                        creatingDraftRef.current = true;
                        setSaving(true);
                        try {
                          const payload = {
                            name,
                            premises: premises.split(",").map((s) => s.trim()).filter(Boolean),
                            conclusion,
                            lines: lines.map((l) => ({ lineNo: l.lineNo, formula: l.formula, rule: l.rule, refs: (l.refs ?? []).map((s) => String(s).trim()).filter(Boolean), depth: Number(l.depth ?? 0) })),
                            rules: "tfl_basic",
                            skipValidation: true,
                          };
                          const res = await fetch("/api/proofs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                          if (res.ok) {
                            const data = await res.json().catch(() => ({}));
                            setDraftId(data?.item?.id ?? null);
                            setSavedVisible(true);
                            setTimeout(() => setSavedVisible(false), 2500);
                          } else {
                            setAutoSave(false);
                            toast.error("Failed to create draft (sign in?)");
                          }
                        } finally {
                          creatingDraftRef.current = false;
                          setSaving(false);
                        }
                      }
                    }}
                  />
                  <span className="font-medium">Auto-save</span>
                </label>
              </div>
              <Button
                ref={saveBtnRef}
                variant="secondary"
                onClick={() => performSave()}
                disabled={!allRequirementsMet}
                title={!allRequirementsMet ? "Complete rule references before saving" : undefined}
              >
                Save
              </Button>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setShowRestartDialog(true)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Restart proof</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="bg-background/50 border rounded-lg overflow-hidden">
          <div className="w-full overflow-auto">
            <table className="w-full min-w-full table-auto border-separate border-spacing-x-2 border-spacing-y-0 text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="w-24 text-left font-medium py-2 px-2">#</th>
                  <th className="w-24 text-left font-medium py-2 px-2">Subproof</th>
                  <th className="text-left font-medium py-2 px-2 min-w-[18rem]">Expression</th>
                  <th className="text-left font-medium py-2 px-2 min-w-[16rem] w-64">Rule</th>
                  <th className="text-left font-medium py-2 px-2 w-44">Refs</th>
                  <th className="text-left font-medium py-2 px-2 w-56">Actions</th>
                  <th className="text-left font-medium py-2 px-2 w-56">Status</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const refCount = getRefCount(line.rule);
                  const v = validationByLineNo.get(String(line.lineNo));
                  const depthMarkers = "".padStart(line.depth, "┃");
                  return (
                    <tr key={i} className="align-middle border-t" style={{ transform: `translateX(${line.depth * 16}px)` }}>
                      <td className="py-1 px-2 w-24">
                        <Input
                          className="h-8 px-2 py-1 text-xs w-16 min-w-16"
                          placeholder="#"
                          value={line.lineNo}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, lineNo: v } : l)));
                          }}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-1">
                          {(() => {
                            const prevDepth = i > 0 ? (lines[i-1]?.depth ?? 0) : 0;
                            const nextDepth = i < lines.length - 1 ? (lines[i+1]?.depth ?? line.depth) : line.depth;
                            let brace = "";
                            if ((line.depth ?? 0) > prevDepth) brace = "⎧";
                            else if (nextDepth < (line.depth ?? 0)) brace = "⎭";
                            else if ((line.depth ?? 0) > 0) brace = "│";
                            return <span className="font-mono text-xs w-3 text-muted-foreground inline-block text-center">{brace}</span>;
                          })()}
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => pushDepth(i)} aria-label="Start subproof">(</Button>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => pullDepth(i)} aria-label="End subproof">)</Button>
                          <span className="text-xs text-muted-foreground ml-1">{line.depth}</span>
                        </div>
                      </td>
                      <td className="py-1 px-2">
                        <Input
                          className="h-8 px-2 py-1 text-xs w-full min-w-[16rem]"
                          placeholder="Formula"
                          value={line.formula}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, formula: v } : l)));
                          }}
                          onFocus={(e) => { activeInputRef.current = e.target; }}
                        />
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={line.rule ?? ""}
                            onValueChange={(v) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, rule: v, refs: [] } : l)))}
                          >
                            <SelectTrigger size="sm" className="h-8 min-w-[16rem]">
                              <SelectValue placeholder="Select rule" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Premise">Premise</SelectItem>
                              <SelectItem value="Reiteration">Reiteration</SelectItem>
                              <SelectItem value="Conjunction Intro">Conjunction Intro</SelectItem>
                              <SelectItem value="Conjunction Elim">Conjunction Elim</SelectItem>
                              <SelectItem value="Conditional Elim">Conditional Elim</SelectItem>
                              <SelectItem value="Modus Tollens">Modus Tollens</SelectItem>
                              <SelectItem value="Disjunction Intro">Disjunction Intro</SelectItem>
                              <SelectItem value="Double Negation Intro">Double Negation Intro</SelectItem>
                              <SelectItem value="Double Negation Elim">Double Negation Elim</SelectItem>
                              <SelectItem value="Biconditional Intro">Biconditional Intro</SelectItem>
                              <SelectItem value="Biconditional Elim">Biconditional Elim</SelectItem>
                              <SelectItem value="Disjunction Elim">Disjunction Elim</SelectItem>
                              <SelectItem value="Negation Intro">Negation Intro</SelectItem>
                              <SelectItem value="De Morgan">De Morgan</SelectItem>
                              <SelectItem value="Explosion">Explosion</SelectItem>
                              <SelectItem value="Conditional Intro">Conditional Intro</SelectItem>
                              <SelectItem value="Negation Elim">Negation Elim</SelectItem>
                              <SelectItem value="Excluded Middle">Excluded Middle</SelectItem>
                              <SelectItem value="Disjunctive Syllogism">Disjunctive Syllogism</SelectItem>
                              <SelectItem value="Indirect Proof">Indirect Proof</SelectItem>
                              <SelectItem value="Equality Intro">Equality Intro</SelectItem>
                              <SelectItem value="Equality Elim">Equality Elim</SelectItem>
                              <SelectItem value="Universal Intro">Universal Intro</SelectItem>
                              <SelectItem value="Universal Elim">Universal Elim</SelectItem>
                              <SelectItem value="Existential Intro">Existential Intro</SelectItem>
                              <SelectItem value="Existential Elim">Existential Elim</SelectItem>
                              <SelectItem value="Conversion of Quantifiers">Conversion of Quantifiers</SelectItem>
                            </SelectContent>
                          </Select>
                          <Popover>
                            <PopoverTrigger className="text-xs underline">Pick refs</PopoverTrigger>
                            <PopoverContent>
                              <div className="max-h-64 overflow-auto pr-1">
                                <div className="text-xs text-muted-foreground mb-1">Click to add references</div>
                                <div className="grid grid-cols-2 gap-1">
                                  {lines.slice(0, i).filter((l) => (l.depth ?? 0) <= (line.depth ?? 0)).map((l, idx0Filtered) => (
                                    <button
                                      key={idx0Filtered}
                                      type="button"
                                      className="text-left text-xs px-2 py-1 rounded hover:bg-accent"
                                      onClick={() => {
                                        setLines((prev) => prev.map((ll, idx2) => {
                                          if (idx2 !== i) return ll;
                                          const next = [...(ll.refs ?? [])];
                                          // Recompute the actual index in original lines for safety
                                          const candidates = lines.slice(0, i).filter((c) => (c.depth ?? 0) <= (line.depth ?? 0));
                                          const chosen = candidates[idx0Filtered];
                                          if (chosen) next.push(String(chosen.lineNo));
                                          return { ...ll, refs: Array.from(new Set(next)) };
                                        }));
                                      }}
                                    >
                                      #{l.lineNo} {l.formula ? `– ${l.formula}` : ""}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-2">
                          {Array.from({ length: refCount }).map((_, j) => (
                            <Input
                              key={j}
                              className="h-8 px-2 py-1 text-xs w-12"
                              placeholder={`R${j + 1}`}
                              value={line.refs[j] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setLines((prev) =>
                                  prev.map((l, idx) => {
                                    if (idx !== i) return l;
                                    const refs = [...(l.refs ?? [])];
                                    refs[j] = val;
                                    return { ...l, refs };
                                  })
                                );
                              }}
                            />
                          ))}
                          <span className="text-[10px] text-muted-foreground">{Math.min((line.refs ?? []).filter((x) => String(x ?? "").trim()).length, refCount)}/{refCount}</span>
                        </div>
                      </td>
                      <td className="py-1 px-2">
                        <TooltipProvider delayDuration={200}>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => addLineAt(i)} aria-label="Insert row after">
                                  <Plus />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Insert row after</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => deleteLineAt(i)} aria-label="Delete row">
                                  <Trash2 />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete row</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </td>
                      <td className="py-1 px-2">
                        <div className={`text-xs ${v?.ok ? "text-green-500" : v ? "text-red-500" : "text-muted-foreground"}`}>
                          {v ? (v.ok ? "OK" : v.messages.join("; ")) : ""}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        {result && (
          <div className="rounded-lg border p-4">
            <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
        
        {/* Restart Confirmation Modal */}
        <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-orange-500" />
                Restart Proof
              </DialogTitle>
              <DialogDescription className="text-left">
                Are you sure you want to restart? This will clear all your current work including:
                <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                  <li>Proof name and details</li>
                  <li>All proof steps and formulas</li>
                  <li>Validation results</li>
                  <li>Any unsaved changes</li>
                </ul>
                <span className="block mt-3 font-medium text-orange-600">This action cannot be undone.</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRestartDialog(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  resetProof();
                  setShowRestartDialog(false);
                  toast.success("Proof restarted successfully");
                }}
                className="w-full sm:w-auto"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restart Proof
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Readable Proof Dialog */}
        <Dialog open={showReadableDialog} onOpenChange={setShowReadableDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Readable Proof</DialogTitle>
              <DialogDescription>Plain, human-friendly rendering of your proof.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Name</div>
                <div className="text-muted-foreground">{name || "(untitled)"}</div>
              </div>
              <div>
                <div className="font-medium">Premises</div>
                <div className="text-muted-foreground">{premises || "(none)"}</div>
              </div>
              <div>
                <div className="font-medium">Conclusion</div>
                <div className="text-muted-foreground">{conclusion || "(none)"}</div>
              </div>
              <div>
                <div className="font-medium mb-1">Lines</div>
                <div className="rounded-md border p-3 bg-background/50">
                  <ol className="space-y-1">
                    {lines.map((l, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground w-6">{l.lineNo}</span>
                        <span className="whitespace-pre font-mono">
                          {" ".repeat((l.depth ?? 0) * 2)}{l.formula || ""}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {(l.rule && l.rule !== "") ? `(${l.rule}${(l.refs ?? []).length ? ": " + (l.refs ?? []).join(",") : ""})` : "(Premise)"}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReadableDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Validation Modal */}
        <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Validation Failed</DialogTitle>
              <DialogDescription>
                Your proof doesn't pass validation. You can still save it as a draft, but it may contain logical errors.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
                <h4 className="font-medium text-destructive mb-2">Validation Issues:</h4>
                <ul className="text-sm text-destructive/80 space-y-1">
                  {result?.lines?.filter((l: any) => !l.ok).map((l: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-xs">#{l.lineNo}:</span>
                      <span>{l.messages?.join(", ") || "Invalid"}</span>
                    </li>
                  )) || <li>Unknown validation errors</li>}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Do you want to save this proof anyway? You can return to edit it later.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowValidationModal(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  setShowValidationModal(false);
                  if (pendingSave) {
                    pendingSave();
                    setPendingSave(null);
                  }
                }}
              >
                Save Anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}


