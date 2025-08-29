import { NextResponse } from "next/server";

const RULESETS = {
  tfl_basic: [
    { name: "Premise", refs: 0 },
    { name: "Reiteration", refs: 1 },
    { name: "Conjunction Intro", refs: 2 },
    { name: "Conjunction Elim", refs: 1 },
    { name: "Conditional Elim", refs: 2 },
    { name: "Modus Tollens", refs: 2 },
    { name: "Disjunction Intro", refs: 1 },
    { name: "Double Negation Intro", refs: 1 },
    { name: "Double Negation Elim", refs: 1 },
    { name: "Biconditional Intro", refs: 2 },
    { name: "Biconditional Elim", refs: 2 },
    { name: "Disjunction Elim", refs: 3 },
    { name: "Negation Intro", refs: 2 },
    { name: "De Morgan", refs: 1 },
    { name: "Explosion", refs: 1 },
    { name: "Conditional Intro", refs: 2 },
    { name: "Negation Elim", refs: 1 },
    { name: "Excluded Middle", refs: 0 },
    { name: "Disjunctive Syllogism", refs: 2 },
    { name: "Indirect Proof", refs: 1 },
  ],
  fol_basic: [
    { name: "Equality Intro", refs: 0 },
    { name: "Equality Elim", refs: 2 },
    { name: "Universal Intro", refs: 1 },
    { name: "Universal Elim", refs: 1 },
    { name: "Existential Intro", refs: 1 },
    { name: "Existential Elim", refs: 2 },
    { name: "Conversion of Quantifiers", refs: 1 },
  ],
};

export async function GET() {
  return NextResponse.json({ rulesets: RULESETS });
}


