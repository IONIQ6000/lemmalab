export type Ruleset = "tfl_basic" | "tfl_derived" | "fol_basic" | "fol_derived";

export interface ProofLineInput {
  lineNo: string;
  formula?: string;
  rule?: string;
  refs?: string[];
  comment?: string;
  depth?: number;
}

export interface LineValidation {
  lineNo: string;
  ok: boolean;
  messages: string[];
  evidence?: LineEvidence;
}

export interface ProofValidationResult {
  ok: boolean;
  lines: LineValidation[];
  subproofs?: SubproofFrame[];
}

export interface LineEvidence {
  rule: string;
  refs: string[];
  info?: string;
}

export interface SubproofFrame {
  depth: number;
  startLineNo: string;
  endLineNo: string;
  assumptionFormula?: string;
}


