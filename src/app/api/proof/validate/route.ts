import { NextResponse } from "next/server";
import { validateProof } from "@/lib/proofchecker/engine";

export async function POST(request: Request) {
  const { premises = [], conclusion = "", lines = [], rules = "tfl_basic" } = await request.json();
  const result = validateProof(premises, conclusion, lines, rules);
  return NextResponse.json(result);
}


