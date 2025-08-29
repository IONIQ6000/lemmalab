/// <reference lib="webworker" />

import { validateProof } from "./engine";

type ValidateInput = {
  premises: string[];
  conclusion: string;
  lines: any[];
  rules: string;
};

self.onmessage = (e: MessageEvent<ValidateInput>) => {
  try {
    const { premises, conclusion, lines, rules } = e.data;
    const result = validateProof(premises, conclusion, lines, rules);
    (self as unknown as Worker).postMessage({ ok: true, result });
  } catch (error: any) {
    (self as unknown as Worker).postMessage({ ok: false, error: String(error?.message ?? error) });
  }
};


